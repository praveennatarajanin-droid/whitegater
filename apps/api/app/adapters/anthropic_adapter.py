import time
import json
import httpx
from typing import Dict, Any, AsyncGenerator, Tuple
from app.adapters.base import BaseProviderAdapter
from app.logging_config import logger

class AnthropicProviderAdapter(BaseProviderAdapter):
    """
    Translates OpenAI-formatted request payloads to Anthropic Messages API format and back.
    """
    async def chat_completion(self, payload: Dict[str, Any], api_key: str, base_url: str) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        # Translate payload
        anthropic_payload = self._translate_payload(payload)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=anthropic_payload)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(
                    f"Anthropic provider error {resp.status_code}: {resp.text}",
                    request=resp.request,
                    response=resp
                )
            anthropic_res = resp.json()
            return self._normalize_response(anthropic_res, payload.get("model", "whitegator-code"))

    async def chat_completion_stream(self, payload: Dict[str, Any], api_key: str, base_url: str) -> AsyncGenerator[str, None]:
        # For simplicity, yield chunked response or event-stream format
        res = await self.chat_completion(payload, api_key, base_url)
        chunk = {
            "id": res.get("id"),
            "object": "chat.completion.chunk",
            "created": res.get("created"),
            "model": res.get("model"),
            "choices": [
                {
                    "index": 0,
                    "delta": {"role": "assistant", "content": res["choices"][0]["message"]["content"]},
                    "finish_reason": "stop"
                }
            ]
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    async def test_connection(self, api_key: str, base_url: str, **kwargs) -> Tuple[bool, int, str]:
        start = time.time()
        url = f"{base_url.rstrip('/')}/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        test_payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "ping"}]
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=test_payload)
                latency = int((time.time() - start) * 1000)
                if resp.status_code in [200, 400]: # 400 with valid key means auth succeeded
                    return True, latency, "Successfully authenticated with Anthropic"
                return False, latency, f"Anthropic auth failed ({resp.status_code}): {resp.text}"
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            return False, latency, str(e)

    def _translate_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        messages = []
        system_prompt = None
        for m in payload.get("messages", []):
            role = m.get("role")
            content = m.get("content", "")
            if role == "system":
                system_prompt = content
            else:
                messages.append({"role": role if role in ["user", "assistant"] else "user", "content": content})

        out = {
            "model": payload.get("model", "claude-3-5-sonnet-20241022"),
            "messages": messages if messages else [{"role": "user", "content": "Hello"}],
            "max_tokens": payload.get("max_tokens", 1024)
        }
        if system_prompt:
            out["system"] = system_prompt
        return out

    def _normalize_response(self, res: Dict[str, Any], requested_model: str) -> Dict[str, Any]:
        content_text = ""
        for block in res.get("content", []):
            if block.get("type") == "text":
                content_text += block.get("text", "")

        usage = res.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)

        return {
            "id": f"chatcmpl-ant-{res.get('id', 'res')}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": requested_model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": content_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": input_tokens,
                "completion_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
        }
