import time
import json
import httpx
from typing import Dict, Any, AsyncGenerator, Tuple
from app.adapters.base import BaseProviderAdapter

class GeminiProviderAdapter(BaseProviderAdapter):
    """
    Translates OpenAI payload to Google Gemini REST API format and normalizes response.
    """
    async def chat_completion(self, payload: Dict[str, Any], api_key: str, base_url: str) -> Dict[str, Any]:
        target_model = payload.get("model", "gemini-1.5-flash")
        url = f"{base_url.rstrip('/')}/models/{target_model}:generateContent?key={api_key}"
        
        contents = []
        for m in payload.get("messages", []):
            role = "user" if m.get("role") in ["user", "system"] else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m.get("content", "")}]
            })
            
        gemini_payload = {"contents": contents}
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=gemini_payload)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(f"Gemini error {resp.status_code}: {resp.text}", request=resp.request, response=resp)
            res_data = resp.json()
            return self._normalize_response(res_data, target_model)

    async def chat_completion_stream(self, payload: Dict[str, Any], api_key: str, base_url: str) -> AsyncGenerator[str, None]:
        res = await self.chat_completion(payload, api_key, base_url)
        chunk = {
            "id": res.get("id"),
            "object": "chat.completion.chunk",
            "created": res.get("created"),
            "model": res.get("model"),
            "choices": [{
                "index": 0,
                "delta": {"role": "assistant", "content": res["choices"][0]["message"]["content"]},
                "finish_reason": "stop"
            }]
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    async def test_connection(self, api_key: str, base_url: str, **kwargs) -> Tuple[bool, int, str]:
        start = time.time()
        url = f"{base_url.rstrip('/')}/models?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                latency = int((time.time() - start) * 1000)
                if resp.status_code == 200:
                    return True, latency, "Successfully connected to Gemini API"
                return False, latency, f"Gemini connection failed ({resp.status_code}): {resp.text}"
        except Exception as e:
            return False, int((time.time() - start) * 1000), str(e)

    def _normalize_response(self, res: Dict[str, Any], model: str) -> Dict[str, Any]:
        text_content = ""
        candidates = res.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for p in parts:
                text_content += p.get("text", "")
                
        usage_meta = res.get("usageMetadata", {})
        prompt_tokens = usage_meta.get("promptTokenCount", 10)
        completion_tokens = usage_meta.get("candidatesTokenCount", 20)

        return {
            "id": f"chatcmpl-gemini-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": text_content},
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens
            }
        }
