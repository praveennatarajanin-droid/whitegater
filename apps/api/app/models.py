import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from app.database import Base

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
    role = Column(String(50), nullable=False, default="DEVELOPER")
    status = Column(String(50), nullable=False, default="active")
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    credentials = relationship("ProviderCredential", back_populates="organization", cascade="all, delete-orphan")

class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False, default="developer")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="members")

class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    team = relationship("Team", back_populates="members")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="projects")
    team = relationship("Team", back_populates="projects")
    api_keys = relationship("ApiKey", back_populates="project", cascade="all, delete-orphan")

class Provider(Base):
    __tablename__ = "providers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_code = Column(String(50), unique=True, nullable=False, index=True) # openai, anthropic, gemini, azure, groq, openrouter, ollama, custom
    name = Column(String(100), nullable=False)
    base_url = Column(String(255), nullable=False)
    is_custom = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    credentials = relationship("ProviderCredential", back_populates="provider", cascade="all, delete-orphan")
    models = relationship("ModelCatalog", back_populates="provider", cascade="all, delete-orphan")

class ProviderCredential(Base):
    __tablename__ = "provider_credentials"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String(36), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    encrypted_api_key = Column(Text, nullable=False)
    custom_base_url = Column(String(255), nullable=True)
    azure_api_version = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    organization = relationship("Organization", back_populates="credentials")
    provider = relationship("Provider", back_populates="credentials")
    deployments = relationship("ModelDeployment", back_populates="credential", cascade="all, delete-orphan")

class ModelCatalog(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_id = Column(String(36), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    model_code = Column(String(100), nullable=False, index=True) # e.g. gpt-4o, claude-3-5-sonnet
    display_name = Column(String(150), nullable=False)
    model_alias = Column(String(100), nullable=True)
    capabilities = Column(JSON, nullable=False, default={"streaming": True, "vision": False, "tools": True, "json_mode": True})
    context_window = Column(Integer, nullable=False, default=128000)
    input_cost_per_1m = Column(Float, nullable=False, default=0.0)
    output_cost_per_1m = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="USD")
    enabled = Column(Boolean, nullable=False, default=True)
    status = Column(String(30), nullable=False, default="active") # active, degraded, disabled
    metadata_json = Column(JSON, nullable=True, default={})

    provider = relationship("Provider", back_populates="models")
    deployments = relationship("ModelDeployment", back_populates="model", cascade="all, delete-orphan")

class ModelDeployment(Base):
    __tablename__ = "model_deployments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    credential_id = Column(String(36), ForeignKey("provider_credentials.id", ondelete="CASCADE"), nullable=False)
    priority = Column(Integer, nullable=False, default=1)
    weight = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    latency_p90_ms = Column(Integer, nullable=False, default=0)

    model = relationship("ModelCatalog", back_populates="deployments")
    credential = relationship("ProviderCredential", back_populates="deployments")

from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, JSON, Index

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    key_prefix = Column(String(24), nullable=False, index=True)
    key_hash = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    status = Column(String(30), nullable=False, default="active") # active, revoked, expired
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    permissions = Column(JSON, nullable=False, default=dict) # {"models": ["*"], "endpoints": ["*"], "projects": ["*"], "organizations": ["*"]}
    limits = Column(JSON, nullable=False, default=dict) # {"rpm": 60, "tpm": 100000, "daily_budget": None, "monthly_budget": None, "max_request_size": None}
    budget_usd = Column(Float, nullable=True)
    spend_usd = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    project = relationship("Project", back_populates="api_keys")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False, index=True) # create, revoke, rotate, inspect
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=utc_now, index=True)

class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(64), unique=True, nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_code = Column(String(50), nullable=False, index=True)
    model_requested = Column(String(100), nullable=False, index=True)
    model_executed = Column(String(100), nullable=False, index=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    status_code = Column(Integer, nullable=False, index=True)
    latency_ms = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Float, nullable=False, default=0.0)
    error_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

Index("idx_request_logs_org_time", RequestLog.organization_id, RequestLog.created_at)
Index("idx_request_logs_proj_time", RequestLog.project_id, RequestLog.created_at)
Index("idx_request_logs_team_time", RequestLog.team_id, RequestLog.created_at)
Index("idx_request_logs_key_time", RequestLog.api_key_id, RequestLog.created_at)
Index("idx_request_logs_prov_time", RequestLog.provider_code, RequestLog.created_at)
Index("idx_request_logs_model_time", RequestLog.model_executed, RequestLog.created_at)

class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    endpoint = Column(String(255), nullable=False)
    auth_config = Column(JSON, nullable=True) # Encrypted credentials / tokens
    status = Column(String(30), nullable=False, default="active") # active, degraded, disabled
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class MCPTool(Base):
    __tablename__ = "mcp_tools"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    server_id = Column(String(36), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    parameters_schema = Column(JSON, nullable=True)
    is_approved = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class AgentRegistry(Base):
    __tablename__ = "agent_registries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    endpoint = Column(String(255), nullable=False)
    protocol = Column(String(50), nullable=False, default="http") # http, grpc, ws
    status = Column(String(30), nullable=False, default="active")
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class ToolExecutionLog(Base):
    __tablename__ = "tool_execution_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tool_id = Column(String(36), ForeignKey("mcp_tools.id", ondelete="SET NULL"), nullable=True)
    tool_name = Column(String(150), nullable=False)
    input_payload = Column(JSON, nullable=True)
    output_payload = Column(JSON, nullable=True)
    status_code = Column(Integer, nullable=False, default=200)
    latency_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)


