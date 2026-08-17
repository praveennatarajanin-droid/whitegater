import time
import json
import httpx
from typing import Dict, Any, AsyncGenerator, Tuple
from app.adapters.base import BaseProviderAdapter
from app.logging_config import logger

class OpenAIProviderAdapter(BaseProviderAdapter):
    async def chat_completion(self, payload: Dict[str, Any], api_key: str, base_url: str) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                error_body = resp.text
                logger.error(f"OpenAI provider error HTTP {resp.status_code}: {error_body}")
                raise httpx.HTTPStatusError(
                    f"OpenAI provider returned {resp.status_code}: {error_body}",
                    request=resp.request,
                    response=resp
                )
            return resp.json()

    async def chat_completion_stream(self, payload: Dict[str, Any], api_key: str, base_url: str) -> AsyncGenerator[str, None]:
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload["stream"] = True
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    error_text = await resp.aread()
                    raise httpx.HTTPStatusError(
                        f"OpenAI streaming error {resp.status_code}: {error_text.decode('utf-8')}",
                        request=resp.request,
                        response=resp
                    )
                async for line in resp.aiter_lines():
                    if line:
                        yield f"{line}\n"

    async def embeddings(self, payload: Dict[str, Any], api_key: str, base_url: str) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(f"OpenAI embeddings error {resp.status_code}", request=resp.request, response=resp)
            return resp.json()

    async def test_connection(self, api_key: str, base_url: str, **kwargs) -> Tuple[bool, int, str]:
        start = time.time()
        url = f"{base_url.rstrip('/')}/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                latency = int((time.time() - start) * 1000)
                if resp.status_code == 200:
                    return True, latency, "Successfully authenticated with OpenAI"
                return False, latency, f"OpenAI auth failed with status {resp.status_code}: {resp.text}"
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return False, latency, f"Connection error: {str(e)}"
