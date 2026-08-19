from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.database import check_db_connection
from app.redis_client import redis_cache

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def get_system_health():
    db_health = check_db_connection()
    redis_health = redis_cache.check_health()
    
    is_healthy = db_health.get("status") == "healthy"
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_health,
        "redis": redis_health,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/database")
def get_database_health():
    return check_db_connection()

@router.get("/redis")
def get_redis_health():
    return redis_cache.check_health()
