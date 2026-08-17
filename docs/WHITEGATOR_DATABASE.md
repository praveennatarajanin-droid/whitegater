# WhiteGator AI Gateway — Database Schema & Data Architecture Specification

## Overview

WhiteGator uses **PostgreSQL 16** as its primary relational database and **Redis 7** for fast caching, rate limiting, and ephemeral state management.

All database interactions in the Python backend use **SQLAlchemy 2.0 AsyncIO** with **Alembic** for schema migrations. UUIDv4 is used for primary keys across all domain entities.

---

## Entity Relationship Summary

```
[Organization] 1 ─── N [Team] 1 ─── N [Project] 1 ─── N [ApiKey] 1 ─── N [ApiKeyPermission]
      │                   │                 │               │
      │                   │                 │               ├── N [RequestLog] ── 1 ── 1 [TokenUsage]
      │                   │                 │               │                                │
      │                   │                 │               └── N [SpendRecord] ─────────────┘
      │                   │                 │
      ├── N [User]        └── N [Budget]    ├── N [RateLimit]
      │                                     │
      ├── N [Provider]                      ├── N [RoutingRule]
      │        │                            │
      │        └── 1 ── N [ProviderCredential]
      │                                     ├── N [GuardrailPolicy]
      │                                     │
      ├── N [Model]                         ├── N [MCPServer] 1 ── N [MCPTool]
      │      │                              │
      │      └── 1 ── N [ModelDeployment]   └── N [Agent]
```

---

## Detailed Data Dictionary & Schema Definitions

### 1. `users` Table
Stores registered platform users, authentication state, and global system roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2id hashed password |
| `full_name` | VARCHAR(150) | NOT NULL | User's full display name |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'DEVELOPER' | Global platform role (`SUPER_ADMIN`, `USER`) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

---

### 2. `organizations` Table
Root tenant boundary for multi-tenancy isolation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique organization ID |
| `name` | VARCHAR(150) | NOT NULL | Organization name |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | URL-friendly unique identifier |
| `owner_id` | UUID | REFERENCES users(id) ON DELETE RESTRICT | Owner user account ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

---

### 3. `organization_members` Table (Junction Table)
Maps users to organizations with org-level RBAC roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Junction record ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Org reference |
| `user_id` | UUID | REFERENCES users(id) ON DELETE CASCADE | User reference |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'DEVELOPER' | Org role (`ORG_ADMIN`, `TEAM_MANAGER`, `DEVELOPER`, `VIEWER`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Joining timestamp |

---

### 4. `teams` Table
Departmental or functional grouping within an organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique team ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Parent org |
| `name` | VARCHAR(150) | NOT NULL | Team name |
| `description` | TEXT | NULLABLE | Description |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

---

### 5. `projects` Table
Operational workspace for microservices, applications, or environments (e.g. Production, Staging).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique project ID |
| `team_id` | UUID | REFERENCES teams(id) ON DELETE CASCADE | Parent team |
| `name` | VARCHAR(150) | NOT NULL | Project name |
| `description` | TEXT | NULLABLE | Description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

---

### 6. `providers` Table
Master catalog of supported AI vendors (OpenAI, Anthropic, Gemini, Groq, Ollama, Custom).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique provider ID |
| `provider_code` | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | Vendor code (`openai`, `anthropic`, `gemini`, `groq`, `ollama`, `custom`) |
| `name` | VARCHAR(100) | NOT NULL | Vendor display name |
| `base_url` | VARCHAR(255) | NOT NULL | Default endpoint API base URL |
| `is_custom` | BOOLEAN | NOT NULL, DEFAULT false | Whether vendor is user-configured endpoint |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Global availability |

---

### 7. `provider_credentials` Table
Encrypted credentials (API keys) for upstream LLM providers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Credential ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Parent org |
| `provider_id` | UUID | REFERENCES providers(id) ON DELETE RESTRICT | Target provider |
| `name` | VARCHAR(100) | NOT NULL | Label (e.g. "Prod OpenAI Tier 4 Key") |
| `encrypted_api_key` | TEXT | NOT NULL | AES-256-GCM / Fernet encrypted credential |
| `custom_base_url` | VARCHAR(255) | NULLABLE | Override endpoint URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active state flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

---

### 8. `models` Table
Catalog of physical LLM models and virtual model aliases.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Model ID |
| `provider_id` | UUID | REFERENCES providers(id) ON DELETE RESTRICT | Native provider |
| `model_code` | VARCHAR(100) | NOT NULL, INDEX | Official model code (`gpt-4o`, `claude-3-5-sonnet-20241022`) |
| `display_name` | VARCHAR(150) | NOT NULL | User-facing display name |
| `is_virtual_alias` | BOOLEAN | NOT NULL, DEFAULT false | Flag for alias models (e.g. `smart-model`) |
| `prompt_cost_per_1m` | NUMERIC(12, 6) | NOT NULL, DEFAULT 0.0 | Input price per 1,000,000 tokens ($USD) |
| `completion_cost_per_1m` | NUMERIC(12, 6) | NOT NULL, DEFAULT 0.0 | Output price per 1,000,000 tokens ($USD) |
| `context_window` | INTEGER | NOT NULL, DEFAULT 128000 | Max context window tokens |
| `supports_vision` | BOOLEAN | NOT NULL, DEFAULT false | Multimodal image support |
| `supports_streaming` | BOOLEAN | NOT NULL, DEFAULT true | SSE streaming capability |
| `supports_tools` | BOOLEAN | NOT NULL, DEFAULT true | Function calling capability |

---

### 9. `model_deployments` Table
Concrete deployment instances of models bound to credentials and routing priorities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Deployment ID |
| `model_id` | UUID | REFERENCES models(id) ON DELETE CASCADE | Associated model |
| `credential_id` | UUID | REFERENCES provider_credentials(id) ON DELETE CASCADE | Credential to authenticate call |
| `priority` | INTEGER | NOT NULL, DEFAULT 1 | Priority order (lower = higher priority) |
| `weight` | INTEGER | NOT NULL, DEFAULT 100 | Load balancing weight |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Deployment active status |
| `latency_p90_ms` | INTEGER | NOT NULL, DEFAULT 0 | Rolling P90 latency cache |

---

### 10. `api_keys` Table
Virtual gateway keys issued to clients for proxy authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Key ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Owning project |
| `key_prefix` | VARCHAR(24) | NOT NULL, INDEX | Public key prefix (`wg-live-8f92a1b0`) |
| `key_hash` | VARCHAR(128) | UNIQUE, NOT NULL, INDEX | SHA-256 hash of plaintext key |
| `name` | VARCHAR(150) | NOT NULL | Purpose label |
| `budget_usd` | NUMERIC(10, 2) | NULLABLE | Max spend limit ($USD) |
| `spend_usd` | NUMERIC(10, 4) | NOT NULL, DEFAULT 0.0 | Current accumulated spend |
| `rate_limit_rpm` | INTEGER | NULLABLE | Override Requests Per Minute cap |
| `rate_limit_tpm` | INTEGER | NULLABLE | Override Tokens Per Minute cap |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active flag |
| `expires_at` | TIMESTAMPTZ | NULLABLE | Expiration timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

---

### 11. `api_key_permissions` Table
Fine-grained model and path restriction rules per Virtual API Key.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Permission ID |
| `api_key_id` | UUID | REFERENCES api_keys(id) ON DELETE CASCADE | Associated API key |
| `allowed_model_id` | UUID | REFERENCES models(id) ON DELETE CASCADE | Allowed model |
| `allowed_endpoints` | JSONB | NOT NULL, DEFAULT '["/v1/chat/completions"]' | Whitelisted endpoint array |

---

### 12. `budgets` Table
Financial cap policies assigned at Org, Team, Project, or Key levels.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Budget ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Org scope |
| `team_id` | UUID | NULLABLE, REFERENCES teams(id) ON DELETE CASCADE | Optional Team scope |
| `project_id` | UUID | NULLABLE, REFERENCES projects(id) ON DELETE CASCADE | Optional Project scope |
| `name` | VARCHAR(100) | NOT NULL | Label |
| `max_budget_usd` | NUMERIC(12, 2) | NOT NULL | Hard spending ceiling ($USD) |
| `soft_limit_usd` | NUMERIC(12, 2) | NULLABLE | Soft notification ceiling ($USD) |
| `reset_period` | VARCHAR(20) | NOT NULL, DEFAULT 'MONTHLY' | Reset frequency (`NEVER`, `DAILY`, `WEEKLY`, `MONTHLY`) |
| `last_reset_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last reset timestamp |

---

### 13. `rate_limits` Table
Configurable rate limit policies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Policy ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Owning project |
| `name` | VARCHAR(100) | NOT NULL | Policy label |
| `max_rpm` | INTEGER | NOT NULL, DEFAULT 60 | Max Requests Per Minute |
| `max_tpm` | INTEGER | NOT NULL, DEFAULT 100000 | Max Tokens Per Minute |
| `max_rpd` | INTEGER | NULLABLE | Max Requests Per Day |
| `max_tpd` | INTEGER | NULLABLE | Max Tokens Per Day |

---

### 14. `routing_rules` Table
Dynamic routing configurations for gateway model requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Rule ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Owning project |
| `virtual_model_code` | VARCHAR(100) | NOT NULL, INDEX | Virtual model code (`smart-model`) |
| `routing_strategy` | VARCHAR(50) | NOT NULL, DEFAULT 'PRIORITY' | Strategy (`PRIORITY`, `WEIGHTED`, `LEAST_LATENCY`, `LEAST_COST`) |
| `fallback_rule_id` | UUID | NULLABLE | Link to fallback chain |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Rule status |

---

### 15. `fallback_rules` Table
Failover cascades for handling model/provider errors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Fallback ID |
| `name` | VARCHAR(100) | NOT NULL | Cascade rule name |
| `trigger_status_codes` | JSONB | NOT NULL, DEFAULT '[429, 500, 502, 503, 504]' | HTTP trigger codes array |
| `fallback_model_ids` | JSONB | NOT NULL | Array of ordered backup model UUIDs |
| `max_retries` | INTEGER | NOT NULL, DEFAULT 3 | Retry count limit |
| `backoff_factor` | NUMERIC(4, 2) | NOT NULL, DEFAULT 1.5 | Backoff multiplier |

---

### 16. `guardrails` Table
Core security & safety filter definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Guardrail ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Parent org |
| `name` | VARCHAR(100) | NOT NULL | Filter label |
| `type` | VARCHAR(50) | NOT NULL | Type (`PII_MASKING`, `PROMPT_INJECTION`, `TOXICITY`, `REGEX_BLOCK`) |
| `config` | JSONB | NOT NULL | Rules, regex patterns, or entity types |
| `action` | VARCHAR(20) | NOT NULL, DEFAULT 'BLOCK' | Action (`BLOCK`, `MASK`, `LOG_ONLY`) |

---

### 17. `guardrail_policies` Table
Binds guardrail rules to projects or specific API keys.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Policy ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Target project |
| `guardrail_id` | UUID | REFERENCES guardrails(id) ON DELETE CASCADE | Applied guardrail |
| `stage` | VARCHAR(20) | NOT NULL, DEFAULT 'PRE_REQUEST' | Execution stage (`PRE_REQUEST`, `POST_RESPONSE`) |

---

### 18. `mcp_servers` Table
Registered Model Context Protocol (MCP) server endpoints.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Server ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Owning project |
| `name` | VARCHAR(100) | NOT NULL | Server label |
| `transport_type` | VARCHAR(20) | NOT NULL, DEFAULT 'SSE' | Transport (`SSE`, `STDIO`) |
| `server_url` | VARCHAR(255) | NOT NULL | SSE endpoint or command string |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Status flag |

---

### 19. `mcp_tools` Table
Discovered tools exposed by registered MCP servers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Tool ID |
| `mcp_server_id` | UUID | REFERENCES mcp_servers(id) ON DELETE CASCADE | Parent MCP server |
| `name` | VARCHAR(100) | NOT NULL | Tool name |
| `description` | TEXT | NULLABLE | Tool description |
| `parameters_schema` | JSONB | NOT NULL | OpenAPI parameter JSON schema |

---

### 20. `agents` Table
Autonomous AI agent registry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Agent ID |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE | Owning project |
| `name` | VARCHAR(100) | NOT NULL | Agent name |
| `system_prompt` | TEXT | NULLABLE | Default instructions |
| `assigned_model_id` | UUID | REFERENCES models(id) ON DELETE RESTRICT | Primary assigned model |
| `max_steps` | INTEGER | NOT NULL, DEFAULT 20 | Safety execution step ceiling |

---

### 21. `request_logs` Table
Asynchronous high-volume telemetry repository for every gateway interaction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Log ID |
| `request_id` | VARCHAR(64) | UNIQUE, NOT NULL, INDEX | External Request ID (`req_...`) |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE, INDEX | Owning project |
| `api_key_id` | UUID | REFERENCES api_keys(id) ON DELETE SET NULL, INDEX | Authenticated key |
| `model_requested` | VARCHAR(100) | NOT NULL | Client requested model |
| `model_executed` | VARCHAR(100) | NOT NULL | Actual target model resolved |
| `provider_code` | VARCHAR(50) | NOT NULL | Actual vendor executed |
| `status_code` | INTEGER | NOT NULL | HTTP status code returned to client |
| `latency_ms` | INTEGER | NOT NULL | End-to-end total roundtrip (ms) |
| `cost_usd` | NUMERIC(12, 6) | NOT NULL, DEFAULT 0.0 | Calculated request cost ($USD) |
| `guardrail_triggered` | BOOLEAN | NOT NULL, DEFAULT false | Whether a guardrail triggered |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now(), INDEX | Execution timestamp |

---

### 22. `token_usages` Table
Granular prompt and completion token counts linked to request logs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Usage ID |
| `request_log_id` | UUID | UNIQUE, REFERENCES request_logs(id) ON DELETE CASCADE | Parent request log |
| `prompt_tokens` | INTEGER | NOT NULL, DEFAULT 0 | Input prompt token count |
| `completion_tokens` | INTEGER | NOT NULL, DEFAULT 0 | Output completion token count |
| `total_tokens` | INTEGER | NOT NULL, DEFAULT 0 | Total token sum |

---

### 23. `spend_records` Table
Aggregated ledger records for fast budget calculation and financial reporting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Record ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE, INDEX | Org scope |
| `project_id` | UUID | REFERENCES projects(id) ON DELETE CASCADE, INDEX | Project scope |
| `api_key_id` | UUID | REFERENCES api_keys(id) ON DELETE CASCADE, INDEX | Key scope |
| `amount_usd` | NUMERIC(12, 6) | NOT NULL | Amount spent ($USD) |
| `request_log_id` | UUID | REFERENCES request_logs(id) ON DELETE CASCADE | Originating log |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now(), INDEX | Transaction timestamp |

---

### 24. `audit_logs` Table
Immutable security audit log for admin operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Audit record ID |
| `organization_id` | UUID | REFERENCES organizations(id) ON DELETE CASCADE | Org scope |
| `user_id` | UUID | REFERENCES users(id) ON DELETE SET NULL | Performing user |
| `action` | VARCHAR(100) | NOT NULL, INDEX | Action code (e.g. `CREATE_API_KEY`, `UPDATE_CREDENTIAL`) |
| `resource_type` | VARCHAR(50) | NOT NULL | Target entity type |
| `resource_id` | VARCHAR(64) | NOT NULL | Target entity UUID |
| `ip_address` | VARCHAR(45) | NULLABLE | Client IP address |
| `changes` | JSONB | NULLABLE | Pre/post change JSON diff |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now(), INDEX | Timestamp |

---

## Database Performance Indexes

```sql
-- High-throughput gateway lookup indexes
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_request_logs_created_project ON request_logs(project_id, created_at DESC);
CREATE INDEX idx_spend_records_org_date ON spend_records(organization_id, created_at DESC);
CREATE INDEX idx_models_provider ON models(provider_id);
CREATE INDEX idx_deployments_model_active ON model_deployments(model_id, is_active, priority ASC);
```
