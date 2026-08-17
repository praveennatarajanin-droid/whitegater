import time
from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator, Tuple, Optional
import httpx

class BaseProviderAdapter(ABC):
    @abstractmethod
    async def chat_completion(self, payload: Dict[str, Any], api_key: str, base_url: str) -> Dict[str, Any]:
        """Executes a standard non-streaming chat completion call."""
        pass

    @abstractmethod
    async def chat_completion_stream(self, payload: Dict[str, Any], api_key: str, base_url: str) -> AsyncGenerator[str, None]:
        """Executes a SSE streaming chat completion call yielding text chunks."""
        pass

    @abstractmethod
    async def test_connection(self, api_key: str, base_url: str, **kwargs) -> Tuple[bool, int, str]:
        """
        Makes a REAL network HTTP request to test provider authentication.
        Returns: (success: bool, latency_ms: int, message: str)
        """
        pass
