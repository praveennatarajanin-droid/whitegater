import redis
from typing import Optional
from app.config import settings
from app.logging_config import logger

class RedisCache:
    def __init__(self):
        self._redis_client: Optional[redis.Redis] = None
        self._in_memory_fallback: dict = {}
        self._init_client()

    def _init_client(self):
        try:
            self._redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True,
                socket_timeout=2.0
            )
            # Test ping
            self._redis_client.ping()
            logger.info("Successfully connected to Redis instance.")
        except Exception as e:
            logger.warning(f"Redis connection unavailable ({str(e)}). Using robust in-memory cache fallback.")
            self._redis_client = None

    def get(self, key: str) -> Optional[str]:
        if self._redis_client:
            try:
                return self._redis_client.get(key)
            except Exception as e:
                logger.error(f"Redis GET error for key '{key}': {str(e)}")
        return self._in_memory_fallback.get(key)

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        if self._redis_client:
            try:
                return bool(self._redis_client.set(key, value, ex=ex))
            except Exception as e:
                logger.error(f"Redis SET error for key '{key}': {str(e)}")
        self._in_memory_fallback[key] = value
        return True

    def delete(self, key: str) -> bool:
        if self._redis_client:
            try:
                return bool(self._redis_client.delete(key))
            except Exception as e:
                logger.error(f"Redis DELETE error for key '{key}': {str(e)}")
        self._in_memory_fallback.pop(key, None)
        return True

    def check_health(self) -> dict:
        if self._redis_client:
            try:
                self._redis_client.ping()
                info = self._redis_client.info()
                return {
                    "status": "healthy",
                    "mode": "redis",
                    "version": info.get("redis_version", "unknown"),
                    "connected_clients": info.get("connected_clients", 1)
                }
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "mode": "in_memory_fallback",
                    "error": str(e)
                }
        return {
            "status": "degraded",
            "mode": "in_memory_fallback",
            "message": "Redis disconnected; operating with active in-memory cache."
        }

redis_cache = RedisCache()
