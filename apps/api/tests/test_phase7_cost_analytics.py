import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import RequestLog, ModelCatalog, Organization, Project, ApiKey
from app.services.cost_engine import cost_engine_service

client = TestClient(app)

def test_cost_calculation_formula():
    # Model rates: $2.50 input / 1M, $10.00 output / 1M
    input_tokens = 100_000 # 0.1M => $0.25
    output_tokens = 50_000 # 0.05M => $0.50
    # Expected cost = 0.25 + 0.50 = 0.75 USD
    calculated_cost = cost_engine_service.calculate_request_cost(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        input_cost_per_1m=2.50,
        output_cost_per_1m=10.00
    )
    assert calculated_cost == 0.75

def test_dashboard_analytics_and_costs_endpoints():
    Base.metadata.create_all(bind=engine)
    from app.seed import seed_database
    seed_database()
    db = SessionLocal()

    import uuid
    log = RequestLog(
        request_id=f"req_test_analytics_{uuid.uuid4().hex[:12]}",
        provider_code="openai",
        model_requested="whitegator-smart",
        model_executed="gpt-4o",
        input_tokens=1000,
        output_tokens=500,
        total_tokens=1500,
        status_code=200,
        latency_ms=250,
        cost_usd=0.0075,
        created_at=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()
    db.close()

    usage_resp = client.get("/dashboard/usage")
    assert usage_resp.status_code == 200
    usage_data = usage_resp.json()
    assert "summary" in usage_data
    assert usage_data["summary"]["total_requests"] >= 1

    costs_resp = client.get("/dashboard/costs")
    assert costs_resp.status_code == 200
    costs_data = costs_resp.json()
    assert "period_aggregations_usd" in costs_data
    assert "today" in costs_data["period_aggregations_usd"]

    analytics_resp = client.get("/dashboard/analytics")
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    assert "summary" in analytics_data
    assert "breakdowns" in analytics_data
