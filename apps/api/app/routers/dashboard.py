from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db, check_db_connection
from app.redis_client import redis_cache
from app.models import User, Provider, ModelCatalog, ApiKey, RequestLog

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_providers = db.query(Provider).filter(Provider.is_active == True).count()
    total_models = db.query(ModelCatalog).count()
    total_keys = db.query(ApiKey).filter(ApiKey.is_active == True).count()
    total_requests = db.query(RequestLog).count()
    
    # Calculate real spend and latency stats
    total_spend = db.query(func.sum(RequestLog.cost_usd)).scalar() or 0.0
    avg_latency = db.query(func.avg(RequestLog.latency_ms)).scalar() or 0.0
    
    db_status = check_db_connection()
    redis_status = redis_cache.check_health()
    
    # Recent logs for stream list
    recent_logs = db.query(RequestLog).order_by(RequestLog.created_at.desc()).limit(5).all()
    logs_data = [
        {
            "id": log.id,
            "request_id": log.request_id,
            "model": log.model_executed,
            "provider": log.provider_code,
            "status_code": log.status_code,
            "latency_ms": log.latency_ms,
            "cost_usd": log.cost_usd,
            "created_at": log.created_at.isoformat() if log.created_at else ""
        }
        for log in recent_logs
    ]

    return {
        "overview": {
            "total_users": total_users,
            "total_providers": total_providers,
            "total_models": total_models,
            "active_keys": total_keys,
            "total_requests": total_requests,
            "total_spend_usd": round(total_spend, 6),
            "avg_latency_ms": round(avg_latency, 1)
        },
        "system_health": {
            "overall": "healthy" if db_status.get("status") == "healthy" else "degraded",
            "database": db_status,
            "redis": redis_status
        },
        "recent_activity": logs_data
    }
