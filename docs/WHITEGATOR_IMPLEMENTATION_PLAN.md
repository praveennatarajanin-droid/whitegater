# WhiteGator AI Gateway — Production Implementation Plan

## Executive Overview

This Implementation Plan details the phased execution strategy for constructing **WhiteGator**, an enterprise-grade AI Gateway and Orchestration Platform.

Development is structured into sequential phases to guarantee foundational stability, complete database integrity, security-first virtual key proxying, and Merlin-themed UI presentation.

---

## Phased Implementation Roadmap

```
  +--------------------------------------------------------------------+
  | Phase 1: Foundation Setup, DB Schema & Base Engine Architecture   |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 2: Auth, Multi-Tenancy Hierarchy & Virtual API Key System    |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 3: Provider Adapters, Model Registry & Token/Cost Engine    |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 4: Gateway Proxy Engine, Routing & Retry/Fallback Cascade    |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 5: Rate Limiting, Token Tracking & Budget Management         |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 6: Enterprise Guardrails, Request Logging & Telemetry        |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 7: MCP Protocol, Agent Integration & Interactive Playground  |
  +--------------------------------------------------------------------+
                                   │
                                   ▼
  +--------------------------------------------------------------------+
  | Phase 8: Merlin UI Dashboard, Admin Suite & Production Hardening   |
  +--------------------------------------------------------------------+
```

---

## Phase 1: Foundation Setup, DB Schema & Base Engine Architecture

### Objective
Establish the project codebase structure, environment configuration, PostgreSQL database schema with SQLAlchemy 2.0 AsyncIO / Alembic migrations, Redis caching connection, and FastAPI service skeleton.

### Backend Work
- Initialize Python project structure (`/backend`) with `pyproject.toml` / `requirements.txt`.
- Set up FastAPI app instance, CORS middleware, global exception handlers, and standard response wrappers.
- Configure Async SQLAlchemy engine, session generator, and Redis pool initialization.
- Create base models and utility functions for async context management.

### Database Work
- Define complete PostgreSQL DDL schema & SQLAlchemy ORM models (`User`, `Organization`, `Team`, `Project`, `Provider`, `ProviderCredential`, `Model`, `ModelDeployment`, `ApiKey`, `ApiKeyPermission`, `RequestLog`, `TokenUsage`, `SpendRecord`, `Budget`, `RateLimit`, `RoutingRule`, `FallbackRule`, `Guardrail`, `GuardrailPolicy`, `MCPServer`, `MCPTool`, `Agent`, `AuditLog`).
- Configure initial Alembic migration (`001_initial_schema.py`).
- Implement database seed script (`seed_data.py`) pre-populating standard providers (OpenAI, Anthropic, Gemini, Groq, Ollama) and model pricing catalogs.

### API Work
- Health check endpoints (`GET /health`, `GET /health/readiness`, `GET /health/liveness`).
- Base API router structure (`/api/v1` and `/v1`).

### Security Work
- Secret key loading from environment variables (`.env`).
- Fernet symmetric key setup for encrypted provider keys.

### Testing Requirements
- Unit tests verifying PostgreSQL connection, Redis connection, database seed execution, and schema integrity (`pytest tests/test_db.py`).

### Completion Criteria
- FastAPI server starts cleanly without errors.
- Alembic migration executes cleanly creating all 24 tables.
- Seed script populates provider catalog.
- `/health` endpoint returns `200 OK` with database and Redis operational status.

---

## Phase 2: Auth, Multi-Tenancy Hierarchy & Virtual API Key System

### Objective
Implement user registration, JWT authentication, Organization -> Team -> Project multi-tenancy hierarchy, and the complete Virtual API Key creation, hashing, and resolution engine.

### Backend Work
- Implement `Argon2id` password hashing and verification.
- Implement JWT token generation (access & refresh tokens) with Redis blacklist revocation.
- Build Virtual Key generation utility (`wg-live-...` 32-byte secure random generator).
- Implement SHA-256 key hashing engine and Redis key lookup cache decorator (<1ms resolution).

### Frontend Work
- Initialize Next.js 14 project structure (`/frontend`) with Tailwind CSS v4 and Merlin CSS design tokens.
- Build Merlin UI Authentication layout (Paper white canvas `#f5f5f4`, floating capsule headers, pill inputs).
- Build Sign-In / Register pages with form validation and JWT cookie handling.
- Build Workspace / Organization creation modal.

### Database Work
- Ensure cascade deletes and foreign key constraints function properly across `organizations`, `teams`, `projects`, and `api_keys`.

### API Work
- Auth endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me`.
- Multi-tenancy endpoints: `GET/POST /api/v1/organizations`, `GET/POST /api/v1/projects`.
- API Key management endpoints: `GET/POST/DELETE /api/v1/keys`.

### Security Work
- RBAC middleware enforcing `SUPER_ADMIN`, `ORG_ADMIN`, `TEAM_MANAGER`, `DEVELOPER`, `VIEWER`.
- Secure plaintext key display rule (key string returned ONLY ONCE during initial `POST /api/v1/keys`).

### Testing Requirements
- Integration tests for JWT lifecycle, RBAC access denial, virtual key generation, hashing, and Redis key lookup performance (`pytest tests/test_auth_keys.py`).

### Completion Criteria
- Users can register, log in, create organizations, teams, and projects.
- Developers can issue virtual API keys (`wg-live-...`).
- Plaintext key is never written to DB; SHA-256 hash lookup in Redis resolves project context in <1ms.

---

## Phase 3: Provider Adapters, Model Registry & Token/Cost Engine

### Objective
Build normalized provider adapter layer for OpenAI, Anthropic, Gemini, Groq, Ollama, and Custom endpoints, accompanied by dynamic model registry and precise token accounting and cost calculation engines.

### Backend Work
- Define `BaseProviderAdapter` interface contract.
- Implement adapter implementations:
  - `OpenAIAdapter`: Passthrough to OpenAI API REST & SSE streams.
  - `AnthropicAdapter`: Translates OpenAI chat messages to Anthropic `/v1/messages` format and maps SSE events back.
  - `GeminiAdapter`: Translates OpenAI schema to Google Gemini REST/stream format.
  - `GroqAdapter`: Direct Llama/Mixtral high-speed adapter.
  - `OllamaAdapter`: Local network LLM connector.
  - `CustomAdapter`: Generic OpenAI-compatible vLLM/TGI endpoint connector.
- Build Tokenizer Engine utilizing `tiktoken` and provider metadata extractors.
- Build Cost Calculation Engine using real-time dynamic model pricing database tables.

### Frontend Work
- Build Provider Credentials Management page in Merlin UI (add/edit encrypted API keys for OpenAI, Anthropic, Gemini, etc. with status badges).
- Build Model Registry page showing active models, pricing per 1M prompt/completion tokens, and context window limits.

### Database Work
- Ensure provider pricing tables (`models`) can be updated dynamically via API without restart.

### API Work
- Credential management: `GET/POST/DELETE /api/v1/providers/credentials`.
- Model catalog: `GET/POST /api/v1/models`.

### Security Work
- AES-256-GCM / Fernet encryption of provider API keys before insertion into `provider_credentials.encrypted_api_key`.

### Testing Requirements
- Mock adapter unit tests verifying payload translation for Anthropic & Gemini, tokenizer accuracy, and cost calculation correctness (`pytest tests/test_providers.py`).

### Completion Criteria
- Provider adapters seamlessly convert standard OpenAI payloads to Anthropic & Gemini specs and return normalized responses.
- Accurate prompt and completion costs are calculated for every provider call.

---

## Phase 4: Gateway Proxy Engine, Routing & Retry/Fallback Cascade

### Objective
Implement the core high-throughput OpenAI-compatible gateway endpoints (`/v1/chat/completions`, `/v1/models`), dynamic routing engine (Priority, Weighted, Latency, Cost), and automated retry/fallback cascades.

### Backend Work
- Build async gateway pipeline handler in FastAPI.
- Implement streaming proxy engine supporting Server-Sent Events (SSE) streaming (`stream: true`).
- Implement Routing Engine supporting:
  - Priority Cascade
  - Weighted Round-Robin
  - Least Latency P90 Routing
  - Least Cost Routing
- Implement Retry & Fallback Engine with exponential backoff and jitter.

### Frontend Work
- Build Dynamic Routing & Fallbacks visual configuration page in Merlin UI (drag-and-drop or ordered priority lists, weight sliders, fallback trigger status code toggles).

### Database Work
- Add `routing_rules` and `fallback_rules` query optimizers.

### API Work
- OpenAI-compatible Gateway endpoints: `POST /v1/chat/completions`, `GET /v1/models`, `POST /v1/embeddings`.
- Routing rule management endpoints: `GET/POST/PUT /api/v1/routing/rules`.

### Security Work
- Middleware validation of virtual key headers (`Authorization: Bearer wg-live-...`) on all `/v1/*` endpoints.

### Testing Requirements
- End-to-end gateway integration tests for non-streaming and SSE streaming responses, automatic fallback invocation when primary provider fails, and weighted load balancing distribution (`pytest tests/test_gateway.py`).

### Completion Criteria
- Gateway accepts standard OpenAI SDK requests at `http://localhost:8000/v1/chat/completions`.
- SSE streaming works smoothly without buffering.
- When primary provider fails (e.g. simulated 500 error), gateway automatically fails over to backup model seamlessly.

---

## Phase 5: Rate Limiting, Token Tracking & Budget Management

### Objective
Integrate real-time sliding window rate limiting in Redis, automated token accounting, and soft/hard financial budget enforcement at Organization, Team, Project, and Key levels.

### Backend Work
- Implement Redis Lua script for Atomic Sliding-Window Token Bucket rate limiting (RPM, TPM, RPD, TPD).
- Implement Budget Governance Engine:
  - Pre-request budget check (<1ms Redis lookup).
  - Hard limit enforcement (HTTP 429/402 rejection when budget exceeded).
  - Soft limit webhook / alert notification trigger.
  - Reset schedule background runner (`NEVER`, `DAILY`, `WEEKLY`, `MONTHLY`).
- Implement real-time spend ledger writer (`spend_records`).

### Frontend Work
- Build Budget Management & Financial Control dashboard in Merlin UI (progress bars, spend velocity graphs, limit modal, alert thresholds).

### Database Work
- Index `spend_records` and `budgets` for high-speed aggregation queries.

### API Work
- Budget management endpoints: `GET/POST/PUT /api/v1/budgets`.
- Spend analytics endpoint: `GET /api/v1/analytics/spend`.

### Security Work
- Strict rate limit response header injection (`X-RateLimit-Limit-RPM`, `X-RateLimit-Remaining-RPM`, `X-RateLimit-Reset`).

### Testing Requirements
- Unit tests for Redis Lua rate limiter script, concurrent request rate limit enforcement, and hard budget blocking (`pytest tests/test_limits_budgets.py`).

### Completion Criteria
- Requests exceeding RPM/TPM thresholds receive immediate HTTP 429 with standard headers.
- Keys exceeding their budget allocation are blocked instantly from calling providers.

---

## Phase 6: Enterprise Guardrails, Request Logging & Telemetry

### Objective
Build pre-request and post-response guardrail inspection engine (PII masking, prompt injection detection, regex phrase blocking), asynchronous log ingestion queue, and telemetry dashboard.

### Backend Work
- Build Guardrail Pipeline Engine:
  - PII Masking: Regex engine detecting SSN, credit cards, emails, API keys.
  - Prompt Injection Detector: Heuristic & pattern matching engine.
  - Toxic / Banned Word Filter.
- Build Asynchronous Log Ingestion Worker (Batching logs into `request_logs` and `token_usages` without blocking proxy response).
- Expose Prometheus metrics endpoint (`/metrics`).

### Frontend Work
- Build Guardrail Management page in Merlin UI (create PII rules, set actions to BLOCK or MASK).
- Build Request Logs Inspector in Merlin UI (searchable, paginated table of every gateway call with latency, status, tokens, cost, and trace modal).

### Database Work
- Configure JSONB indexes on `guardrails.config` and optimized `created_at` indexes on `request_logs`.

### API Work
- Guardrail management endpoints: `GET/POST /api/v1/guardrails`.
- Telemetry & log endpoints: `GET /api/v1/logs`, `GET /api/v1/logs/{log_id}`, `GET /api/v1/analytics/summary`.

### Security Work
- Configurable log privacy policies (full payload capture vs. metadata-only scrubbed storage).

### Testing Requirements
- Guardrail unit tests verifying PII masking of emails and credit cards, prompt injection blocking, and async log ingestion queue throughput (`pytest tests/test_guardrails_logs.py`).

### Completion Criteria
- Sensitive PII data in prompts is masked automatically before reaching upstream LLMs.
- All requests are logged asynchronously with complete latency, token, and cost metrics available in the dashboard.

---

## Phase 7: MCP Protocol, Agent Integration & Interactive Playground

### Objective
Integrate Model Context Protocol (MCP) tool discovery and execution engine, autonomous agent session tracking, and an interactive multi-model testing Playground UI.

### Backend Work
- Implement MCP Server Client (SSE & StdIO transports) for tool schema discovery (`mcp_servers` & `mcp_tools`).
- Implement Tool Invocation Orchestrator injecting MCP tools into chat completions and handling upstream tool call execution loops.
- Implement Agent Execution Tracker (`agent_id`, `session_id`, max step circuit breakers).
- Implement Playground Execution Runner endpoint.

### Frontend Work
- Build Interactive AI Playground in Merlin UI (multi-model side-by-side prompt testing, parameter sliders, token/cost estimation, raw response viewer).
- Build MCP Tools Registry view in Merlin UI.
- Build Autonomous Agent Monitor view in Merlin UI.

### API Work
- MCP endpoints: `GET/POST /api/v1/mcp/servers`, `GET /api/v1/mcp/tools`.
- Agent endpoints: `GET/POST /api/v1/agents`, `GET /api/v1/agents/{agent_id}/sessions`.
- Playground endpoint: `POST /api/v1/playground/execute`.

### Security Work
- Tool call execution step limit enforcement (max 20 steps per session) to prevent runaway recursive agent loops.

### Testing Requirements
- End-to-end test for MCP tool schema generation, agent session tracking, and Playground runner (`pytest tests/test_mcp_playground.py`).

### Completion Criteria
- Developers can register MCP servers and call tools dynamically through WhiteGator.
- Playground UI allows side-by-side comparison of OpenAI, Anthropic, and Gemini models simultaneously.

---

## Phase 8: Merlin UI Dashboard, Admin Suite & Production Hardening

### Objective
Polishing the complete WhiteGator web application in the **Merlin Design System**, assembling the top-level Executive Dashboard, completing production Docker Compose container configurations, and performing security audits.

### Frontend Work
- Finalize Merlin UI Design System tokens across all dashboard views:
  - Page Canvas: Paper White `#f5f5f4`
  - Cards: Snow White `#ffffff` with 20px radius and thin `#eeeeee` hairlines
  - Primary Action Buttons: Signal Green `#34c759` pill buttons with 100px radius
  - Nav Capsule: Bottom-centered floating white capsule with shadow `0px 3px 8px 0px rgb(238,238,238)`
  - Handwritten script green margin notes and labels (`#34c759`)
  - Product Mockup Card depth shadow `0px 40px 60px 0px rgba(0,0,0,0.25)`
- Build Executive Dashboard summary page featuring real-time Recharts analytics (Request volume, Spend velocity, P90 Latency, Provider breakdown).
- Responsive mobile & desktop navigation testing.

### Backend Work
- Final performance tuning of Uvicorn async workers, HTTPX connection pooling, and Redis connections.
- Complete system audit logging (`audit_logs`) for administrative operations.

### Deployment & Infrastructure Work
- Production `docker-compose.yml` defining `web` (Next.js), `api` (FastAPI), `db` (PostgreSQL), `redis`, `worker`, and `nginx` container services.
- Nginx configuration (`/docker/nginx.conf`) with TLS, CORS, gzip compression, and proxy buffering settings.
- Comprehensive `README.md` setup and deployment guide.

### Testing Requirements
- Full end-to-end integration test suite execution (`pytest tests/`).
- Frontend production build verification (`npm run build`).

### Completion Criteria
- WhiteGator is fully functional, fully documented, and ready for single-command deployment via `docker compose up --build`.
