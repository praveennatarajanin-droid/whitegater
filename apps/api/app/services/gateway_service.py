import time
import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional, AsyncGenerator
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import ApiKey, ModelCatalog, Provider, ProviderCredential, ModelDeployment, RequestLog, Project, Organization
from app.adapters.factory import ProviderAdapterFactory
from app.services.rate_limiter import rate_limiter
from app.logging_config import logger

class GatewayException(HTTPException):
    def __init__(self, status_code: int, message: str, error_type: str):
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "message": message,
                    "type": error_type,
                    "param": None,
                    "code": status_code
                }
            }
        )

class GatewayService:
    @staticmethod
    def hash_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()

    async def process_chat_completion(
        self,
        raw_api_key: str,
        payload: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Executes the 14-step WhiteGator AI Gateway pipeline for non-streaming chat completions.
        """
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:24]}"

        # Step 1: AuthMiddleware & Step 2: TenantResolver
        api_key_obj = self._authenticate_key(raw_api_key, db)
        
        # Step 3: PermissionService
        self._validate_permissions(api_key_obj, endpoint="/v1/chat/completions", requested_model=payload.get("model"))

        # Step 4: BudgetService
        self._validate_budget(api_key_obj, db)

        # Step 5: RateLimitService
        self._validate_rate_limit(api_key_obj)

        # Step 6: ModelResolver
        model_catalog_obj = self._resolve_model(payload.get("model"), api_key_obj.organization_id, db)

        # Step 7: RoutingService
        deployment, credential, provider = self._select_provider_deployment(model_catalog_obj, db)

        # Step 8: ProviderAdapter & Step 9: Execute provider request
        adapter = ProviderAdapterFactory.get_adapter(provider.provider_code)
        
        # Prepare payload for provider execution
        exec_payload = dict(payload)
        exec_payload["model"] = model_catalog_obj.model_code # Pass downstream exact model code
        
        decrypted_key = credential.encrypted_api_key or ""
        base_url = credential.custom_base_url or provider.base_url

        try:
            raw_response = await adapter.chat_completion(exec_payload, decrypted_key, base_url)
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            self._log_request_failure(
                db, request_id, api_key_obj, provider.provider_code,
                payload.get("model", ""), model_catalog_obj.model_code,
                502, latency_ms, "provider_error"
            )
            logger.error(f"Gateway Upstream Error: {str(e)}")
            raise GatewayException(502, "Upstream provider execution failed", "provider_error")

        latency_ms = int((time.time() - start_time) * 1000)

        # Step 10: Normalize provider response
        normalized_res = self._normalize_response(raw_response, payload.get("model"), request_id)

        # Step 11: Extract usage
        usage = normalized_res.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", input_tokens + output_tokens)

        # Step 12: Calculate cost
        cost_usd = self._calculate_cost(input_tokens, output_tokens, model_catalog_obj)

        # Step 13: Store request log & update spend
        self._store_request_log_and_update_spend(
            db, request_id, api_key_obj, provider.provider_code,
            payload.get("model", ""), model_catalog_obj.model_code,
            200, latency_ms, input_tokens, output_tokens, total_tokens, cost_usd
        )

        # Step 14: Return OpenAI-compatible response
        return normalized_res

    async def process_chat_completion_stream(
        self,
        raw_api_key: str,
        payload: Dict[str, Any],
        db: Session
    ) -> AsyncGenerator[str, None]:
        """
        Executes the Gateway pipeline for SSE streaming chat completions.
        """
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:24]}"

        api_key_obj = self._authenticate_key(raw_api_key, db)
        self._validate_permissions(api_key_obj, endpoint="/v1/chat/completions", requested_model=payload.get("model"))
        self._validate_budget(api_key_obj, db)
        self._validate_rate_limit(api_key_obj)

        model_catalog_obj = self._resolve_model(payload.get("model"), api_key_obj.organization_id, db)
        deployment, credential, provider = self._select_provider_deployment(model_catalog_obj, db)

        adapter = ProviderAdapterFactory.get_adapter(provider.provider_code)
        exec_payload = dict(payload)
        exec_payload["model"] = model_catalog_obj.model_code
        decrypted_key = credential.encrypted_api_key or ""
        base_url = credential.custom_base_url or provider.base_url

        try:
            async for chunk in adapter.chat_completion_stream(exec_payload, decrypted_key, base_url):
                yield chunk
        except Exception as e:
            logger.error(f"Stream error: {str(e)}")
            raise GatewayException(502, "Provider stream failed", "provider_error")

        latency_ms = int((time.time() - start_time) * 1000)
        # Log estimated stream completion
        self._store_request_log_and_update_spend(
            db, request_id, api_key_obj, provider.provider_code,
            payload.get("model", ""), model_catalog_obj.model_code,
            200, latency_ms, 50, 150, 200, 0.0001
        )

    async def process_embeddings(
        self,
        raw_api_key: str,
        payload: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Executes Gateway pipeline for text embeddings.
        """
        start_time = time.time()
        request_id = f"req_{uuid.uuid4().hex[:24]}"

        api_key_obj = self._authenticate_key(raw_api_key, db)
        self._validate_permissions(api_key_obj, endpoint="/v1/embeddings", requested_model=payload.get("model"))
        self._validate_budget(api_key_obj, db)
        self._validate_rate_limit(api_key_obj)

        model_catalog_obj = self._resolve_model(payload.get("model") or "text-embedding-3-small", api_key_obj.organization_id, db)
        deployment, credential, provider = self._select_provider_deployment(model_catalog_obj, db)

        adapter = ProviderAdapterFactory.get_adapter(provider.provider_code)
        exec_payload = dict(payload)
        exec_payload["model"] = model_catalog_obj.model_code
        decrypted_key = credential.encrypted_api_key or ""
        base_url = credential.custom_base_url or provider.base_url

        try:
            if hasattr(adapter, 'embeddings'):
                res = await adapter.embeddings(exec_payload, decrypted_key, base_url)
            else:
                raise GatewayException(501, "Embeddings not supported for provider", "not_implemented")
        except GatewayException:
            raise
        except Exception as e:
            raise GatewayException(502, f"Provider error: {str(e)}", "provider_error")

        latency_ms = int((time.time() - start_time) * 1000)
        usage = res.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 10)
        cost_usd = self._calculate_cost(prompt_tokens, 0, model_catalog_obj)

        self._store_request_log_and_update_spend(
            db, request_id, api_key_obj, provider.provider_code,
            payload.get("model", ""), model_catalog_obj.model_code,
            200, latency_ms, prompt_tokens, 0, prompt_tokens, cost_usd
        )
        return res

    # --- Private Helper Methods ---

    def _authenticate_key(self, raw_api_key: str, db: Session) -> ApiKey:
        if not raw_api_key:
            raise GatewayException(401, "API key is required. Provide Authorization header: Bearer <key>", "unauthorized")

        clean_key = raw_api_key.replace("Bearer ", "").strip()
        key_hash = self.hash_key(clean_key)

        key_obj = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if not key_obj:
            raise GatewayException(401, "Invalid API key credentials", "unauthorized")

        if not key_obj.is_active or key_obj.status != "active":
            raise GatewayException(401, f"API key is inactive or {key_obj.status}", "unauthorized")

        if key_obj.project_id:
            project_obj = db.query(Project).filter(Project.id == key_obj.project_id).first()
            if project_obj and not project_obj.is_active:
                raise GatewayException(401, "API key's project is suspended or inactive", "unauthorized")

        if key_obj.expires_at:
            exp_at = key_obj.expires_at.replace(tzinfo=timezone.utc) if key_obj.expires_at.tzinfo is None else key_obj.expires_at
            if exp_at < datetime.now(timezone.utc):
                key_obj.status = "expired"
                db.commit()
                raise GatewayException(401, "API key has expired", "unauthorized")

        # Update last used timestamp
        key_obj.last_used_at = datetime.now(timezone.utc)
        db.commit()
        return key_obj

    def _validate_permissions(self, api_key: ApiKey, endpoint: str, requested_model: Optional[str]):
        perms = api_key.permissions or {}
        
        # Validate endpoint
        allowed_endpoints = perms.get("endpoints", ["*"])
        if "*" not in allowed_endpoints and endpoint not in allowed_endpoints:
            raise GatewayException(403, f"API key is not permitted to access endpoint '{endpoint}'", "forbidden")

        # Validate model restriction
        if requested_model:
            allowed_models = perms.get("models", ["*"])
            if "*" not in allowed_models and requested_model not in allowed_models:
                raise GatewayException(403, f"API key is not permitted to access model '{requested_model}'", "forbidden")

    def _validate_budget(self, api_key: ApiKey, db: Session):
        limits = api_key.limits or {}
        
        # Check overall monthly budget limit on API key
        monthly_budget = limits.get("monthly_budget") or api_key.budget_usd
        if monthly_budget and api_key.spend_usd >= monthly_budget:
            raise GatewayException(429, f"Monthly budget limit of ${monthly_budget:.2f} exceeded for API key", "rate_limit_exceeded")

        # Check daily budget limit
        daily_budget = limits.get("daily_budget")
        if daily_budget:
            # Aggregate today's spend for key
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            from sqlalchemy import func
            today_spend = db.query(func.sum(RequestLog.cost_usd)).filter(
                RequestLog.api_key_id == api_key.id,
                RequestLog.created_at >= today_start
            ).scalar() or 0.0
            if today_spend >= daily_budget:
                raise GatewayException(429, f"Daily budget limit of ${daily_budget:.2f} exceeded", "rate_limit_exceeded")

    def _validate_rate_limit(self, api_key: ApiKey):
        limits = api_key.limits or {}
        rpm = limits.get("rpm", 60)
        tpm = limits.get("tpm", 100000)

        is_allowed, msg = rate_limiter.check_rate_limit(
            key_id=api_key.id,
            rpm_limit=rpm,
            tpm_limit=tpm
        )
        if not is_allowed:
            raise GatewayException(429, msg or "Rate limit exceeded", "rate_limit_exceeded")

        rate_limiter.record_request(api_key.id)

    def _resolve_model(self, model_requested: Optional[str], org_id: Optional[str], db: Session) -> ModelCatalog:
        if not model_requested:
            model_requested = "whitegator-smart"

        # 1. Direct match on model_code or model_alias
        model_obj = db.query(ModelCatalog).filter(
            (ModelCatalog.model_code == model_requested) | (ModelCatalog.model_alias == model_requested),
            ModelCatalog.enabled == True
        ).first()

        if model_obj:
            return model_obj

        raise GatewayException(404, f"Requested model or alias '{model_requested}' not found or active", "not_found")

    def _select_provider_deployment(self, model_catalog: ModelCatalog, db: Session) -> Tuple[ModelDeployment, ProviderCredential, Provider]:
        deployments = db.query(ModelDeployment).filter(
            ModelDeployment.model_id == model_catalog.id,
            ModelDeployment.is_active == True
        ).order_by(ModelDeployment.priority.asc(), ModelDeployment.weight.desc()).all()

        if not deployments:
            # Fallback: create virtual deployment for provider
            provider = db.query(Provider).filter(Provider.id == model_catalog.provider_id).first()
            if not provider or not provider.is_active:
                raise GatewayException(503, "No active provider deployment available for model", "provider_unavailable")

            # Check if active credential exists or use mock credential
            cred = db.query(ProviderCredential).filter(
                ProviderCredential.provider_id == provider.id,
                ProviderCredential.is_active == True
            ).first()

            if not cred:
                cred = ProviderCredential(
                    id=f"cred_virtual_{provider.provider_code}",
                    organization_id="virtual",
                    provider_id=provider.id,
                    name="Default Virtual Credential",
                    encrypted_api_key="sk-mock-key-whitegator-gateway"
                )

            virtual_deploy = ModelDeployment(
                id=f"dep_virtual_{model_catalog.id}",
                model_id=model_catalog.id,
                credential_id=cred.id
            )
            return virtual_deploy, cred, provider

        # Return primary deployment
        dep = deployments[0]
        cred = db.query(ProviderCredential).filter(ProviderCredential.id == dep.credential_id).first()
        provider = db.query(Provider).filter(Provider.id == cred.provider_id).first() if cred else None

        if not cred or not provider:
            raise GatewayException(503, "Provider credential configuration misconfigured", "provider_unavailable")

        return dep, cred, provider

    def _normalize_response(self, raw_res: Dict[str, Any], requested_model: str, request_id: str) -> Dict[str, Any]:
        if "choices" in raw_res:
            raw_res["model"] = requested_model or raw_res.get("model", "whitegator-smart")
            raw_res["id"] = raw_res.get("id") or f"chatcmpl-{request_id}"
            return raw_res
        
        # Generic normalization fallback
        return {
            "id": f"chatcmpl-{request_id}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": requested_model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": str(raw_res)},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int, model: ModelCatalog) -> float:
        input_cost = (input_tokens / 1_000_000.0) * (model.input_cost_per_1m or 0.0)
        output_cost = (output_tokens / 1_000_000.0) * (model.output_cost_per_1m or 0.0)
        return round(input_cost + output_cost, 6)

    def _store_request_log_and_update_spend(
        self,
        db: Session,
        request_id: str,
        api_key: ApiKey,
        provider_code: str,
        model_requested: str,
        model_executed: str,
        status_code: int,
        latency_ms: int,
        input_tokens: int,
        output_tokens: int,
        total_tokens: int,
        cost_usd: float
    ):
        try:
            # Create request log
            log = RequestLog(
                request_id=request_id,
                organization_id=api_key.organization_id,
                project_id=api_key.project_id,
                api_key_id=api_key.id,
                provider_code=provider_code,
                model_requested=model_requested or model_executed,
                model_executed=model_executed,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                status_code=status_code,
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                created_at=datetime.now(timezone.utc)
            )
            db.add(log)

            # Update API Key spend counter
            api_key.spend_usd = (api_key.spend_usd or 0.0) + cost_usd
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error persisting request log: {str(e)}")

    def _log_request_failure(
        self,
        db: Session,
        request_id: str,
        api_key: ApiKey,
        provider_code: str,
        model_requested: str,
        model_executed: str,
        status_code: int,
        latency_ms: int,
        error_type: str
    ):
        try:
            log = RequestLog(
                request_id=request_id,
                organization_id=api_key.organization_id,
                project_id=api_key.project_id,
                api_key_id=api_key.id,
                provider_code=provider_code,
                model_requested=model_requested or model_executed,
                model_executed=model_executed,
                status_code=status_code,
                latency_ms=latency_ms,
                cost_usd=0.0,
                error_type=error_type,
                created_at=datetime.now(timezone.utc)
            )
            db.add(log)
            db.commit()
        except Exception:
            db.rollback()

gateway_service = GatewayService()
