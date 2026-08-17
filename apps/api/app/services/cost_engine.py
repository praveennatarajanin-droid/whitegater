from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models import RequestLog, ModelCatalog, Organization, Project, Team, ApiKey, Provider

class CostEngineService:
    def calculate_request_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        input_cost_per_1m: float,
        output_cost_per_1m: float
    ) -> float:
        input_cost = (input_tokens / 1_000_000.0) * input_cost_per_1m
        output_cost = (output_tokens / 1_000_000.0) * output_cost_per_1m
        return round(input_cost + output_cost, 6)

    def get_spend_aggregations(
        self,
        db: Session,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Dict[str, float]:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        seven_days_ago = today_start - timedelta(days=6)
        thirty_days_ago = today_start - timedelta(days=29)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        def _query_spend(start_time: datetime, end_time: Optional[datetime] = None) -> float:
            st = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
            q = db.query(func.sum(RequestLog.cost_usd)).filter(RequestLog.created_at >= st)
            if end_time:
                et = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
                q = q.filter(RequestLog.created_at < et)
            if organization_id:
                q = q.filter(RequestLog.organization_id == organization_id)
            if project_id:
                q = q.filter(RequestLog.project_id == project_id)
            return round(q.scalar() or 0.0, 6)

        return {
            "today": _query_spend(today_start),
            "yesterday": _query_spend(yesterday_start, today_start),
            "last_7_days": _query_spend(seven_days_ago),
            "last_30_days": _query_spend(thirty_days_ago),
            "current_month": _query_spend(month_start)
        }

    def get_usage_metrics(
        self,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None,
        team_id: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key_id: Optional[str] = None
    ) -> Dict[str, Any]:
        filters = []
        if start_date:
            filters.append(RequestLog.created_at >= start_date)
        if end_date:
            filters.append(RequestLog.created_at <= end_date)
        if organization_id:
            filters.append(RequestLog.organization_id == organization_id)
        if project_id:
            filters.append(RequestLog.project_id == project_id)
        if team_id:
            filters.append(RequestLog.team_id == team_id)
        if provider:
            filters.append(RequestLog.provider_code == provider)
        if model:
            filters.append(or_(RequestLog.model_executed == model, RequestLog.model_requested == model))
        if api_key_id:
            filters.append(RequestLog.api_key_id == api_key_id)

        base_q = db.query(RequestLog)
        if filters:
            base_q = base_q.filter(and_(*filters))

        total_reqs = base_q.count()
        success_reqs = base_q.filter(RequestLog.status_code == 200).count()
        failed_reqs = base_q.filter(RequestLog.status_code != 200).count()

        total_input_tokens = base_q.with_entities(func.sum(RequestLog.input_tokens)).scalar() or 0
        total_output_tokens = base_q.with_entities(func.sum(RequestLog.output_tokens)).scalar() or 0
        total_tokens = base_q.with_entities(func.sum(RequestLog.total_tokens)).scalar() or 0
        total_spend = base_q.with_entities(func.sum(RequestLog.cost_usd)).scalar() or 0.0
        avg_latency = base_q.with_entities(func.avg(RequestLog.latency_ms)).scalar() or 0.0

        error_rate = round((failed_reqs / total_reqs * 100.0), 2) if total_reqs > 0 else 0.0

        # Detailed logs list
        recent_logs = base_q.order_by(RequestLog.created_at.desc()).limit(50).all()
        logs_data = [
            {
                "id": log.id,
                "request_id": log.request_id,
                "organization_id": log.organization_id,
                "team_id": log.team_id,
                "project_id": log.project_id,
                "api_key_id": log.api_key_id,
                "provider": log.provider_code,
                "model_requested": log.model_requested,
                "model_executed": log.model_executed,
                "input_tokens": log.input_tokens,
                "output_tokens": log.output_tokens,
                "total_tokens": log.total_tokens,
                "latency_ms": log.latency_ms,
                "status_code": log.status_code,
                "cost_usd": round(log.cost_usd, 6),
                "error_type": log.error_type,
                "timestamp": log.created_at.isoformat() if log.created_at else ""
            }
            for log in recent_logs
        ]

        return {
            "summary": {
                "total_requests": total_reqs,
                "successful_requests": success_reqs,
                "failed_requests": failed_reqs,
                "error_rate_pct": error_rate,
                "total_input_tokens": total_input_tokens,
                "total_output_tokens": total_output_tokens,
                "total_tokens": total_tokens,
                "total_spend_usd": round(total_spend, 6),
                "average_latency_ms": round(avg_latency, 1)
            },
            "recent_requests": logs_data
        }

    def get_analytics_breakdown(
        self,
        db: Session,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        filters = []
        if organization_id:
            filters.append(RequestLog.organization_id == organization_id)
        if project_id:
            filters.append(RequestLog.project_id == project_id)

        # Spend by Provider
        provider_spend_q = db.query(
            RequestLog.provider_code,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.total_tokens).label("tokens"),
            func.sum(RequestLog.cost_usd).label("spend")
        )
        if filters:
            provider_spend_q = provider_spend_q.filter(and_(*filters))
        provider_data = [
            {
                "provider": r[0],
                "requests": r[1],
                "tokens": r[2] or 0,
                "spend_usd": round(r[3] or 0.0, 6)
            }
            for r in provider_spend_q.group_by(RequestLog.provider_code).all()
        ]

        # Spend by Model
        model_spend_q = db.query(
            RequestLog.model_executed,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.total_tokens).label("tokens"),
            func.sum(RequestLog.cost_usd).label("spend")
        )
        if filters:
            model_spend_q = model_spend_q.filter(and_(*filters))
        model_data = [
            {
                "model": r[0],
                "requests": r[1],
                "tokens": r[2] or 0,
                "spend_usd": round(r[3] or 0.0, 6)
            }
            for r in model_spend_q.group_by(RequestLog.model_executed).all()
        ]

        # Spend by Project
        project_spend_q = db.query(
            RequestLog.project_id,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.cost_usd).label("spend")
        )
        if filters:
            project_spend_q = project_spend_q.filter(and_(*filters))
        project_data = [
            {
                "project_id": r[0] or "default",
                "requests": r[1],
                "spend_usd": round(r[2] or 0.0, 6)
            }
            for r in project_spend_q.group_by(RequestLog.project_id).all()
        ]

        # Spend by Team
        team_spend_q = db.query(
            RequestLog.team_id,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.cost_usd).label("spend")
        )
        if filters:
            team_spend_q = team_spend_q.filter(and_(*filters))
        team_data = [
            {
                "team_id": r[0] or "default",
                "requests": r[1],
                "spend_usd": round(r[2] or 0.0, 6)
            }
            for r in team_spend_q.group_by(RequestLog.team_id).all()
        ]

        # Spend by API Key
        key_spend_q = db.query(
            RequestLog.api_key_id,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.cost_usd).label("spend")
        )
        if filters:
            key_spend_q = key_spend_q.filter(and_(*filters))
        key_data = [
            {
                "api_key_id": r[0] or "unknown",
                "requests": r[1],
                "spend_usd": round(r[2] or 0.0, 6)
            }
            for r in key_spend_q.group_by(RequestLog.api_key_id).all()
        ]

        return {
            "spend_by_provider": provider_data,
            "spend_by_model": model_data,
            "spend_by_project": project_data,
            "spend_by_team": team_data,
            "spend_by_api_key": key_data
        }

cost_engine_service = CostEngineService()
