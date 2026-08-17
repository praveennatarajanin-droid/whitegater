import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import ApiKey, Organization, Project
from app.services.api_key_service import api_key_service

client = TestClient(app)

@pytest.fixture
def test_org_proj():
    Base.metadata.create_all(bind=engine)
    from app.seed import seed_database
    seed_database()
    db = SessionLocal()
    org = db.query(Organization).first()
    proj = db.query(Project).filter(Project.organization_id == org.id).first() if org else None
    org_id, proj_id = org.id, proj.id
    db.close()
    return org_id, proj_id

def test_api_key_creation_secret_once(test_org_proj):
    org_id, proj_id = test_org_proj
    response = client.post(
        "/api/v1/keys",
        json={
            "name": "Production Key Alpha",
            "organization_id": org_id,
            "project_id": proj_id,
            "permissions": {"models": ["whitegator-fast"], "endpoints": ["/v1/chat/completions"]},
            "limits": {"rpm": 60, "monthly_budget": 100.0}
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "secret_key" in data
    assert data["secret_key"].startswith("wg_live_")
    assert data["key_prefix"].startswith("wg_live_")

    # Verify inspecting key DOES NOT reveal secret
    inspect_resp = client.get(f"/api/v1/keys/{data['id']}")
    assert inspect_resp.status_code == 200
    inspect_data = inspect_resp.json()
    assert "secret_key" not in inspect_data

def test_api_key_revocation(test_org_proj):
    org_id, proj_id = test_org_proj
    db = SessionLocal()
    key_data = api_key_service.create_key(db, "Revoke Key Test", org_id, proj_id)
    db.close()

    secret = key_data["secret_key"]
    key_id = key_data["id"]

    # Revoke key
    revoke_resp = client.post(f"/api/v1/keys/{key_id}/revoke")
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "revoked"

    # Gateway request with revoked key must fail with 401
    gw_resp = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {secret}"},
        json={"model": "whitegator-fast", "messages": [{"role": "user", "content": "test"}]}
    )
    assert gw_resp.status_code == 401

def get_error_type(response):
    data = response.json()
    err = data.get("detail", {}).get("error") if "detail" in data else data.get("error", {})
    return err.get("type"), err.get("message", "")

def test_api_key_expired(test_org_proj):
    org_id, proj_id = test_org_proj
    db = SessionLocal()
    past_time = datetime.now(timezone.utc) - timedelta(hours=1)
    key_data = api_key_service.create_key(db, "Expired Key Test", org_id, proj_id, expires_at=past_time)
    db.close()

    secret = key_data["secret_key"]

    gw_resp = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {secret}"},
        json={"model": "whitegator-fast", "messages": [{"role": "user", "content": "test"}]}
    )
    assert gw_resp.status_code == 401
    err_type, err_msg = get_error_type(gw_resp)
    assert "expired" in err_msg.lower()

def test_api_key_model_restriction(test_org_proj):
    org_id, proj_id = test_org_proj
    db = SessionLocal()
    # Restrict key ONLY to whitegator-fast
    key_data = api_key_service.create_key(
        db, "Restricted Key", org_id, proj_id,
        permissions={"models": ["whitegator-fast"]}
    )
    db.close()

    secret = key_data["secret_key"]

    # Requesting whitegator-smart must fail with 403 Forbidden
    gw_resp = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {secret}"},
        json={"model": "whitegator-smart", "messages": [{"role": "user", "content": "test"}]}
    )
    assert gw_resp.status_code == 403
    err_type, _ = get_error_type(gw_resp)
    assert err_type == "forbidden"

def test_api_key_rate_limit_exceeded(test_org_proj):
    org_id, proj_id = test_org_proj
    db = SessionLocal()
    # Restrict key RPM to 1 request per minute
    key_data = api_key_service.create_key(
        db, "Rate Limited Key", org_id, proj_id,
        limits={"rpm": 1}
    )
    db.close()

    secret = key_data["secret_key"]

    # First request consumes RPM limit 1
    client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {secret}"},
        json={"model": "whitegator-fast", "messages": [{"role": "user", "content": "test"}]}
    )

    # Second immediate request must return 429 Rate Limited
    gw_resp = client.post(
        "/v1/chat/completions",
        headers={"Authorization": f"Bearer {secret}"},
        json={"model": "whitegator-fast", "messages": [{"role": "user", "content": "test"}]}
    )
    assert gw_resp.status_code == 429
    err_type, _ = get_error_type(gw_resp)
    assert err_type == "rate_limit_exceeded"
