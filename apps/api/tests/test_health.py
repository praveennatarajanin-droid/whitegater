import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import check_db_connection
from app.redis_client import redis_cache

client = TestClient(app)

def test_backend_startup_and_health():
    """Verify backend starts and GET /health returns 200 OK"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["app_name"] == "WhiteGator AI Gateway API"
    assert "database" in data
    assert "redis" in data

def test_database_connection_endpoint():
    """Verify GET /health/database checks DB connectivity"""
    response = client.get("/health/database")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_redis_connection_endpoint():
    """Verify GET /health/redis checks Redis/fallback state"""
    response = client.get("/health/redis")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "mode" in data

def test_direct_db_check():
    """Direct Python database connection check"""
    res = check_db_connection()
    assert res["status"] == "healthy"

def test_direct_redis_check():
    """Direct Python Redis health check"""
    res = redis_cache.check_health()
    assert "status" in res
