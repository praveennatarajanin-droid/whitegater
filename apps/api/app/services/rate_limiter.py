import time
from typing import Tuple, Optional, Dict, List
from app.redis_client import redis_cache
from app.logging_config import logger

class RateLimiter:
    """
    Distributed Redis Rate Limiter for WhiteGator API keys.
    Tracks Requests Per Minute (RPM) and Tokens Per Minute (TPM).
    Falls back cleanly to an in-memory sliding window when Redis is offline.
    """
    def __init__(self):
        self._in_memory_rpm: Dict[str, List[float]] = {}
        self._in_memory_tpm: Dict[str, List[Tuple[float, int]]] = {}

    def check_rate_limit(
        self,
        key_id: str,
        rpm_limit: Optional[int] = None,
        tpm_limit: Optional[int] = None,
        estimated_tokens: int = 100
    ) -> Tuple[bool, Optional[str]]:
        now = time.time()
        window_start = now - 60.0

        # Check RPM
        if rpm_limit and rpm_limit > 0:
            current_rpm = self._get_rpm_count(key_id, now, window_start)
            if current_rpm >= rpm_limit:
                return False, f"Rate limit exceeded: {current_rpm} RPM requested, maximum allowed is {rpm_limit} RPM"

        # Check TPM
        if tpm_limit and tpm_limit > 0:
            current_tpm = self._get_tpm_count(key_id, now, window_start)
            if current_tpm + estimated_tokens > tpm_limit:
                return False, f"Token rate limit exceeded: current {current_tpm} TPM, limit is {tpm_limit} TPM"

        return True, None

    def record_request(self, key_id: str, tokens_used: int = 0):
        now = time.time()
        current_minute = int(now // 60)
        rpm_redis_key = f"wg:ratelimit:rpm:{key_id}:{current_minute}"
        tpm_redis_key = f"wg:ratelimit:tpm:{key_id}:{current_minute}"

        if redis_cache._redis_client:
            try:
                pipe = redis_cache._redis_client.pipeline()
                pipe.incr(rpm_redis_key)
                pipe.expire(rpm_redis_key, 120)
                if tokens_used > 0:
                    pipe.incrby(tpm_redis_key, tokens_used)
                    pipe.expire(tpm_redis_key, 120)
                pipe.execute()
                return
            except Exception as e:
                logger.error(f"Redis rate limit record error: {str(e)}")

        # Fallback to in-memory window
        if key_id not in self._in_memory_rpm:
            self._in_memory_rpm[key_id] = []
        self._in_memory_rpm[key_id].append(now)

        if key_id not in self._in_memory_tpm:
            self._in_memory_tpm[key_id] = []
        self._in_memory_tpm[key_id].append((now, tokens_used))

        # Cleanup old entries (>60s)
        window_start = now - 60.0
        self._in_memory_rpm[key_id] = [t for t in self._in_memory_rpm[key_id] if t >= window_start]
        self._in_memory_tpm[key_id] = [(t, tok) for t, tok in self._in_memory_tpm[key_id] if t >= window_start]

    def _get_rpm_count(self, key_id: str, now: float, window_start: float) -> int:
        current_minute = int(now // 60)
        rpm_redis_key = f"wg:ratelimit:rpm:{key_id}:{current_minute}"

        if redis_cache._redis_client:
            try:
                val = redis_cache.get(rpm_redis_key)
                return int(val) if val else 0
            except Exception:
                pass

        # In-memory check
        timestamps = self._in_memory_rpm.get(key_id, [])
        valid_ts = [t for t in timestamps if t >= window_start]
        self._in_memory_rpm[key_id] = valid_ts
        return len(valid_ts)

    def _get_tpm_count(self, key_id: str, now: float, window_start: float) -> int:
        current_minute = int(now // 60)
        tpm_redis_key = f"wg:ratelimit:tpm:{key_id}:{current_minute}"

        if redis_cache._redis_client:
            try:
                val = redis_cache.get(tpm_redis_key)
                return int(val) if val else 0
            except Exception:
                pass

        # In-memory check
        entries = self._in_memory_tpm.get(key_id, [])
        valid_entries = [(t, tok) for t, tok in entries if t >= window_start]
        self._in_memory_tpm[key_id] = valid_entries
        return sum(tok for _, tok in valid_entries)

rate_limiter = RateLimiter()
