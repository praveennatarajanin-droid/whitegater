from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.cost_engine import cost_engine_service

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard Analytics"])

@router.get("/usage")
def get_dashboard_usage(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None, alias="organization"),
    project_id: Optional[str] = Query(None, alias="project"),
    team_id: Optional[str] = Query(None, alias="team"),
    provider: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    api_key_id: Optional[str] = Query(None, alias="api_key"),
    db: Session = Depends(get_db)
):
    """
    Returns real request logs and token usage stats filtered by query parameters.
    """
    dt_start = datetime.fromisoformat(start_date) if start_date else None
    dt_end = datetime.fromisoformat(end_date) if end_date else None

    return cost_engine_service.get_usage_metrics(
        db=db,
        start_date=dt_start,
        end_date=dt_end,
        organization_id=organization_id,
        project_id=project_id,
        team_id=team_id,
        provider=provider,
        model=model,
        api_key_id=api_key_id
    )

@router.get("/costs")
def get_dashboard_costs(
    organization_id: Optional[str] = Query(None, alias="organization"),
    project_id: Optional[str] = Query(None, alias="project"),
    db: Session = Depends(get_db)
):
    """
    Returns spend aggregations (today, yesterday, last 7 days, last 30 days, current month).
    """
    aggregations = cost_engine_service.get_spend_aggregations(
        db=db,
        organization_id=organization_id,
        project_id=project_id
    )
    breakdown = cost_engine_service.get_analytics_breakdown(
        db=db,
        organization_id=organization_id,
        project_id=project_id
    )
    return {
        "period_aggregations_usd": aggregations,
        "spend_by_provider": breakdown["spend_by_provider"],
        "spend_by_model": breakdown["spend_by_model"],
        "spend_by_project": breakdown["spend_by_project"],
        "spend_by_team": breakdown["spend_by_team"],
        "spend_by_api_key": breakdown["spend_by_api_key"]
    }

@router.get("/analytics")
def get_dashboard_analytics(
    organization_id: Optional[str] = Query(None, alias="organization"),
    project_id: Optional[str] = Query(None, alias="project"),
    db: Session = Depends(get_db)
):
    """
    Comprehensive AI Gateway traffic, latency distributions, error rates, and cost breakdowns.
    """
    metrics = cost_engine_service.get_usage_metrics(
        db=db,
        organization_id=organization_id,
        project_id=project_id
    )
    breakdown = cost_engine_service.get_analytics_breakdown(
        db=db,
        organization_id=organization_id,
        project_id=project_id
    )
    return {
        "summary": metrics["summary"],
        "breakdowns": breakdown
    }
