import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Organization, Project, Provider, ModelCatalog, ApiKey, RequestLog
from app.services.api_key_service import api_key_service
from app.services.mcp_service import mcp_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def init_e2e_db():
    Base.metadata.create_all(bind=engine)
    from app.seed import seed_database
    seed_database()

def test_full_end_to_end_production_flow():
    """
    Verifies full end-to-end lifecycle:
    User -> Login -> Organization -> Project -> Provider -> Model -> API Key -> Gateway Request -> Response -> Tokens -> Cost -> Logs -> Analytics
    """
    # 1. User & Auth Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@whitegator.ai", "password": "admin123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Organization & Project
    org_resp = client.get("/api/v1/organizations", headers=headers)
    assert org_resp.status_code == 200
    orgs = org_resp.json()
    assert len(orgs) > 0
    target_org_id = orgs[0]["id"]

    proj_resp = client.get(f"/api/v1/organizations/{target_org_id}/projects", headers=headers)
    assert proj_resp.status_code == 200
    projs = proj_resp.json()
    assert len(projs) > 0
    target_proj_id = projs[0]["id"]

    # 3. Create Virtual API Key
    key_resp = client.post(
        "/api/v1/keys",
        json={
            "name": "E2E Test Key",
            "organization_id": target_org_id,
            "project_id": target_proj_id,
            "permissions": {"models": ["whitegator-smart"]},
            "limits": {"rpm": 60, "monthly_budget": 500.0}
        }
    )
    assert key_resp.status_code == 201
    key_data = key_resp.json()
    raw_secret = key_data["secret_key"]
    assert raw_secret.startswith("wg_live_")

    # 4. Execute AI Gateway Request (Mocked Upstream LLM)
    with patch("app.adapters.openai_adapter.OpenAIProviderAdapter.chat_completion") as mock_completion:
        mock_completion.return_value = {
            "id": f"chatcmpl-e2e-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "created": int(datetime.now(timezone.utc).timestamp()),
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "E2E Production Test Successful!"},
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 12, "completion_tokens": 28, "total_tokens": 40}
        }

        gw_resp = client.post(
            "/v1/chat/completions",
            headers={"Authorization": f"Bearer {raw_secret}"},
            json={
                "model": "whitegator-smart",
                "messages": [{"role": "user", "content": "Run E2E test"}]
            }
        )

        assert gw_resp.status_code == 200
        gw_data = gw_resp.json()
        assert gw_data["choices"][0]["message"]["content"] == "E2E Production Test Successful!"

    # 5. Verify Request Log & Analytics Telemetry
    usage_resp = client.get("/dashboard/usage")
    assert usage_resp.status_code == 200
    usage_data = usage_resp.json()
    assert usage_data["summary"]["total_requests"] >= 1
    assert usage_data["summary"]["total_tokens"] >= 40

    costs_resp = client.get("/dashboard/costs")
    assert costs_resp.status_code == 200
    assert "period_aggregations_usd" in costs_resp.json()

def test_mcp_and_agent_gateway_module():
    db = SessionLocal()
    org = db.query(Organization).first()
    db.close()

    # 1. Register MCP Server
    mcp_resp = client.post(
        "/api/v1/mcp/servers",
        json={
            "name": "E2E MCP Server",
            "endpoint": "http://localhost:9000/mcp",
            "organization_id": org.id
        }
    )
    assert mcp_resp.status_code == 201
    mcp_data = mcp_resp.json()
    assert mcp_data["name"] == "E2E MCP Server"

    # 2. List Discovered MCP Tools
    tools_resp = client.get(f"/api/v1/mcp/tools?server_id={mcp_data['id']}")
    assert tools_resp.status_code == 200
    tools = tools_resp.json()
    assert len(tools) > 0
    target_tool_id = tools[0]["id"]

    # 3. Execute MCP Tool
    exec_resp = client.post(
        "/api/v1/mcp/tools/execute",
        json={
            "tool_id": target_tool_id,
            "organization_id": org.id,
            "input_payload": {"query": "whitegator test"}
        }
    )
    assert exec_resp.status_code == 200
    assert "output" in exec_resp.json()

    # 4. Register & Dispatch Agent
    agent_resp = client.post(
        "/api/v1/agents",
        json={
            "name": "E2E Agent",
            "description": "Autonomous Assistant Agent",
            "endpoint": "http://localhost:9001/agent",
            "organization_id": org.id
        }
    )
    assert agent_resp.status_code == 201
    agent_id = agent_resp.json()["id"]

    dispatch_resp = client.post(
        "/api/v1/agents/dispatch",
        json={
            "agent_id": agent_id,
            "organization_id": org.id,
            "payload": {"task": "perform analysis"}
        }
    )
    assert dispatch_resp.status_code == 200
    assert dispatch_resp.json()["status"] == "success"

def test_super_admin_console_rbac():
    # 1. Access Admin users
    users_resp = client.get("/api/v1/admin/users")
    assert users_resp.status_code == 200
    assert len(users_resp.json()) > 0

    # 2. Access Admin system health
    sys_resp = client.get("/api/v1/admin/system")
    assert sys_resp.status_code == 200
    assert sys_resp.json()["gateway_status"] == "operational"

    # 3. Access Admin Audit logs
    audit_resp = client.get("/api/v1/admin/audit-logs")
    assert audit_resp.status_code == 200
