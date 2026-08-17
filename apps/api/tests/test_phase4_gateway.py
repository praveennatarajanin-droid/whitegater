import os
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import ApiKey, ModelCatalog, Provider, ProviderCredential, ModelDeployment, Organization, Project, RequestLog
from app.services.api_key_service import api_key_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    from app.seed import seed_database
    seed_database()
    db = SessionLocal()
    org = db.query(Organization).first()
    proj = db.query(Project).filter(Project.organization_id == org.id).first() if org else None

    key_res = api_key_service.create_key(
        db=db,
        name="Gateway Test Key",
        organization_id=org.id,
        permissions={"models": ["*"], "endpoints": ["*"]},
        limits={"rpm": 100, "tpm": 500000, "monthly_budget": 100.0}
    )
    db.close()
    return key_res

def get_gateway_error_type(response):
    data = response.json()
    err = data.get("detail", {}).get("error") if "detail" in data else data.get("error", {})
    return err.get("type")

def test_gateway_unauthorized_missing_key():
    response = client.post(
        "/v1/chat/completions",
        json={"model": "whitegator-smart", "messages": [{"role": "user", "content": "Hello"}]}
    )
    assert response.status_code == 401
    assert get_gateway_error_type(response) == "unauthorized"

def test_gateway_unauthorized_invalid_key():
    response = client.post(
        "/v1/chat/completions",
        headers={"Authorization": "Bearer wg_live_invalid_key_string_hash_mismatch"},
        json={"model": "whitegator-smart", "messages": [{"role": "user", "content": "Hello"}]}
    )
    assert response.status_code == 401
    assert get_gateway_error_type(response) == "unauthorized"

def test_gateway_model_not_found(setup_db):
    valid_key = setup_db["secret_key"]
    response = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {valid_key}"},
        json={"model": "non-existent-super-model-xyz", "messages": [{"role": "user", "content": "Hello"}]}
    )
    # Gateway falls back to active smart model or returns 404
    assert response.status_code in [200, 404]

@patch("app.adapters.openai_adapter.OpenAIProviderAdapter.chat_completion")
def test_gateway_successful_chat_completion_mocked(mock_chat, setup_db):
    valid_key = setup_db["secret_key"]
    mock_chat.return_value = {
        "id": "chatcmpl-mock123",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "gpt-4o",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Hello! I am WhiteGator AI."},
                "finish_reason": "stop"
            }
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
    }

    response = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {valid_key}"},
        json={
            "model": "whitegator-smart",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["choices"][0]["message"]["content"] == "Hello! I am WhiteGator AI."
    assert res_data["model"] == "whitegator-smart"

def test_gateway_list_models():
    response = client.get("/v1/models")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["object"] == "list"
    assert len(res_data["data"]) > 0

@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="Real OpenAI API Key not configured in environment")
def test_gateway_real_provider_integration(setup_db):
    """
    Real provider integration test using environment credentials when available.
    """
    valid_key = setup_db["secret_key"]
    response = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {valid_key}"},
        json={
            "model": "whitegator-fast",
            "messages": [{"role": "user", "content": "Say hello in 1 word"}]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "choices" in data
