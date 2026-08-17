import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, JSON, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default="DEVELOPER")  # SUPER_ADMIN, DEVELOPER
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False, default="DEVELOPER")  # ORG_ADMIN, TEAM_MANAGER, DEVELOPER, VIEWER
    created_at = Column(DateTime, nullable=False, default=utc_now)

class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class Provider(Base):
    __tablename__ = "providers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_code = Column(String(50), unique=True, nullable=False, index=True) # openai, anthropic, gemini, groq, ollama, custom
    name = Column(String(100), nullable=False)
    base_url = Column(String(255), nullable=False)
    is_custom = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

class ProviderCredential(Base):
    __tablename__ = "provider_credentials"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String(36), ForeignKey("providers.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(100), nullable=False)
    encrypted_api_key = Column(Text, nullable=False)
    custom_base_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class ModelCatalog(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_id = Column(String(36), ForeignKey("providers.id", ondelete="RESTRICT"), nullable=False)
    model_code = Column(String(100), nullable=False, index=True) # e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro, smart-model
    display_name = Column(String(150), nullable=False)
    is_virtual_alias = Column(Boolean, nullable=False, default=False)
    prompt_cost_per_1m = Column(Float, nullable=False, default=0.0)
    completion_cost_per_1m = Column(Float, nullable=False, default=0.0)
    context_window = Column(Integer, nullable=False, default=128000)
    supports_vision = Column(Boolean, nullable=False, default=False)
    supports_streaming = Column(Boolean, nullable=False, default=True)
    supports_tools = Column(Boolean, nullable=False, default=True)

class ModelDeployment(Base):
    __tablename__ = "model_deployments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    credential_id = Column(String(36), ForeignKey("provider_credentials.id", ondelete="CASCADE"), nullable=False)
    priority = Column(Integer, nullable=False, default=1)
    weight = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    latency_p90_ms = Column(Integer, nullable=False, default=0)

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    key_prefix = Column(String(24), nullable=False, index=True) # e.g. wg-live-8f92a1b0
    key_hash = Column(String(128), unique=True, nullable=False, index=True) # SHA-256 hash
    name = Column(String(150), nullable=False)
    budget_usd = Column(Float, nullable=True)
    spend_usd = Column(Float, nullable=False, default=0.0)
    rate_limit_rpm = Column(Integer, nullable=True)
    rate_limit_tpm = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class ApiKeyPermission(Base):
    __tablename__ = "api_key_permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    allowed_model_id = Column(String(36), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    allowed_endpoints = Column(JSON, nullable=False, default=["/v1/chat/completions"])

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    max_budget_usd = Column(Float, nullable=False)
    soft_limit_usd = Column(Float, nullable=True)
    reset_period = Column(String(20), nullable=False, default="MONTHLY") # NEVER, DAILY, WEEKLY, MONTHLY
    last_reset_at = Column(DateTime, nullable=False, default=utc_now)

class RateLimitPolicy(Base):
    __tablename__ = "rate_limits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    max_rpm = Column(Integer, nullable=False, default=60)
    max_tpm = Column(Integer, nullable=False, default=100000)
    max_rpd = Column(Integer, nullable=True)
    max_tpd = Column(Integer, nullable=True)

class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    virtual_model_code = Column(String(100), nullable=False, index=True) # e.g. smart-model
    routing_strategy = Column(String(50), nullable=False, default="PRIORITY") # PRIORITY, WEIGHTED, LEAST_LATENCY, LEAST_COST
    fallback_rule_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

class FallbackRule(Base):
    __tablename__ = "fallback_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    trigger_status_codes = Column(JSON, nullable=False, default=[429, 500, 502, 503, 504])
    fallback_model_ids = Column(JSON, nullable=False) # array of model UUIDs
    max_retries = Column(Integer, nullable=False, default=3)
    backoff_factor = Column(Float, nullable=False, default=1.5)

class Guardrail(Base):
    __tablename__ = "guardrails"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False) # PII_MASKING, PROMPT_INJECTION, TOXICITY, REGEX_BLOCK
    config = Column(JSON, nullable=False)
    action = Column(String(20), nullable=False, default="BLOCK") # BLOCK, MASK, LOG_ONLY

class GuardrailPolicy(Base):
    __tablename__ = "guardrail_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    guardrail_id = Column(String(36), ForeignKey("guardrails.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(20), nullable=False, default="PRE_REQUEST") # PRE_REQUEST, POST_RESPONSE

class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    transport_type = Column(String(20), nullable=False, default="SSE") # SSE, STDIO
    server_url = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

class MCPTool(Base):
    __tablename__ = "mcp_tools"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mcp_server_id = Column(String(36), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parameters_schema = Column(JSON, nullable=False)

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    system_prompt = Column(Text, nullable=True)
    assigned_model_id = Column(String(36), ForeignKey("models.id", ondelete="RESTRICT"), nullable=True)
    max_steps = Column(Integer, nullable=False, default=20)

class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True, index=True)
    model_requested = Column(String(100), nullable=False)
    model_executed = Column(String(100), nullable=False)
    provider_code = Column(String(50), nullable=False)
    status_code = Column(Integer, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    cost_usd = Column(Float, nullable=False, default=0.0)
    guardrail_triggered = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

class TokenUsage(Base):
    __tablename__ = "token_usages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_log_id = Column(String(36), ForeignKey("request_logs.id", ondelete="CASCADE"), unique=True, nullable=False)
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)

class SpendRecord(Base):
    __tablename__ = "spend_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=True, index=True)
    amount_usd = Column(Float, nullable=False)
    request_log_id = Column(String(36), ForeignKey("request_logs.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(64), nullable=False)
    ip_address = Column(String(45), nullable=True)
    changes = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)
