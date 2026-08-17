import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

# Ensure database tables exist for test client execution
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def random_email(prefix: str = "test") -> str:
    return f"{prefix}_{secrets.token_hex(6)}@whitegator.ai"

def test_registration_and_login_flow():
    """Verify registration creates user and org, and login returns valid JWT token."""
    email = random_email("reg")
    passw = "securepass123"
    
    # 1. Register User & Org
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": passw,
        "full_name": "Test Engineer",
        "organization_name": "Acme Infra Org"
    })
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["organization"]["role"] == "owner"

    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify /me Endpoint
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == email
    assert len(me_data["organizations"]) >= 1

    # 3. Login Flow
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": passw
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

def test_unauthorized_access_protection():
    """Verify endpoints block requests without valid Authorization Bearer header."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401

    resp_orgs = client.get("/api/v1/organizations")
    assert resp_orgs.status_code == 401

def test_organization_isolation():
    """Verify User A in Org A cannot access or mutate Org B data (Tenant Isolation)."""
    # Create Org A User
    user_a_email = random_email("user_a")
    reg_a = client.post("/api/v1/auth/register", json={
        "email": user_a_email,
        "password": "password123",
        "full_name": "User Alpha",
        "organization_name": "Organization Alpha"
    }).json()
    token_a = reg_a["access_token"]
    org_a_id = reg_a["organization"]["id"]

    # Create Org B User
    user_b_email = random_email("user_b")
    reg_b = client.post("/api/v1/auth/register", json={
        "email": user_b_email,
        "password": "password123",
        "full_name": "User Beta",
        "organization_name": "Organization Beta"
    }).json()
    token_b = reg_b["access_token"]

    # User B attempts to access Org A details -> Should be blocked (403 Forbidden)
    headers_b = {"Authorization": f"Bearer {token_b}"}
    access_attempt = client.get(f"/api/v1/organizations/{org_a_id}", headers=headers_b)
    assert access_attempt.status_code == 403
    assert "Access Denied" in access_attempt.json()["detail"]

def test_rbac_permission_enforcement():
    """Verify Viewer role is blocked from modifying projects or adding members."""
    # 1. Register Owner
    owner_email = random_email("owner_rbac")
    owner_reg = client.post("/api/v1/auth/register", json={
        "email": owner_email,
        "password": "password123",
        "full_name": "Owner User",
        "organization_name": "RBAC Test Org"
    }).json()
    owner_token = owner_reg["access_token"]
    org_id = owner_reg["organization"]["id"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # 2. Register Viewer User & Add to Org as 'viewer'
    viewer_email = random_email("viewer_rbac")
    viewer_reg = client.post("/api/v1/auth/register", json={
        "email": viewer_email,
        "password": "password123",
        "full_name": "Viewer User"
    }).json()
    viewer_token = viewer_reg["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Owner adds Viewer user to Org with 'viewer' role
    add_resp = client.post(f"/api/v1/organizations/{org_id}/members", json={
        "email": viewer_email,
        "role": "viewer"
    }, headers=owner_headers)
    assert add_resp.status_code == 200, f"Add member failed: {add_resp.text}"

    # 3. Viewer attempts to create a project -> Should fail (403 Forbidden)
    proj_attempt = client.post(f"/api/v1/organizations/{org_id}/projects", json={
        "name": "Viewer Unauthorized Project"
    }, headers=viewer_headers)
    assert proj_attempt.status_code == 403
    assert "RBAC Permission Denied" in proj_attempt.json()["detail"]

def test_logout_endpoint():
    """Verify logout endpoint returns success message."""
    email = random_email("logout")
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "password123",
        "full_name": "Logout Tester"
    }).json()
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    logout_resp = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert "Successfully logged out" in logout_resp.json()["message"]
