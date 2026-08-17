# WhiteGator AI Gateway — Product & Systems Architecture Specification

## Executive Overview

**WhiteGator** is an enterprise-grade, high-performance AI Infrastructure Gateway and Orchestration Platform built to provide unified access, granular governance, intelligent routing, security guardrails, and real-time cost control across all major Large Language Model (LLM) providers and custom self-hosted endpoints.

Inspired by modern gateway architecture patterns, WhiteGator delivers an OpenAI-compatible API proxy layer coupled with multi-tenant organizational isolation, virtual key management, dynamic load balancing, fallback cascades, MCP (Model Context Protocol) tool integration, agent orchestration, and deep observability.

The design system follows **Merlin Aesthetics**—a calm, warm paper-white canvas (`#f5f5f4`), dark charcoal type (`#1c1d1f`), Signal Green accent (`#34c759`), subtle hairlines, pill navigation, and handwritten annotation highlights.

---

## 1. Product Architecture

WhiteGator acts as a high-throughput control plane and data plane between client applications (web apps, backend services, autonomous agents, CLI tools) and upstream LLM providers (OpenAI, Anthropic, Google Gemini, Groq, Ollama, custom vLLM/TGI endpoints).

```
                      +-----------------------------------+
                      |      Client Applications          |
                      | (Web Apps, SDKs, Microservices)  |
                      +-----------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                            WHITEGATOR PLATFORM                                    |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                          OpenAI-Compatible Gateway                          |  |
|  |                 (/v1/chat/completions, /v1/models, /v1/embeddings)           |  |
|  +-----------------------------------------------------------------------------+  |
|                                       |                                           |
|  +-----------------------------------------------------------------------------+  |
|  |                     Middleware Governance Pipeline                          |  |
|  | [Auth] -> [Virtual Key] -> [RBAC] -> [Rate Limit] -> [Budget] -> [Guardrail] |  |
|  +-----------------------------------------------------------------------------+  |
|                                       |                                           |
|  +-----------------------------------------------------------------------------+  |
|  |                     Routing & Provider Orchestration                        |  |
|  |   [Model Registry] -> [Dynamic Router] -> [Retry/Fallback] -> [Providers]   |  |
|  +-----------------------------------------------------------------------------+  |
|                                       |                                           |
|  +-----------------------------------------------------------------------------+  |
|  |                      Post-Execution Analytics Engine                        |  |
|  |   [Usage Tracking] -> [Cost Calculator] -> [Async Logger] -> [Redis Cache]   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                        |
             +--------------------------+--------------------------+
             |                          |                          |
             v                          v                          v
    +-----------------+        +-----------------+        +-----------------+
    | OpenAI Provider |        | Anthropic Claude|        | Google Gemini   |
    +-----------------+        +-----------------+        +-----------------+
             |                          |                          |
             v                          v                          v
    +-----------------+        +-----------------+        +-----------------+
    |  Groq Provider  |        | Ollama / Local  |        | Custom Endpoint |
    +-----------------+        +-----------------+        +-----------------+
```

### Core Architecture Capabilities
- **Unified Gateway Interface**: Fully OpenAI API standard compatible for seamless drop-in SDK integration (`openai.OpenAI(base_url="http://whitegator/v1")`).
- **Multi-Tenant Hierarchy**: Organization -> Team -> Project structure with granular RBAC.
- **Virtual API Key Governance**: Scoped virtual keys with spending caps, rate limits, model restrictions, and expiration.
- **Resilient AI Routing Engine**: Priority cascade, latency-based routing, weighted load distribution, and automatic fallback retries.
- **Real-Time Token & Cost Engine**: Exact token accounting (tiktoken / provider metadata) and dynamic pricing calculations.
- **Enterprise Guardrails**: Pre-request prompt moderation, PII redaction, regex injection detection, and post-request response filtering.
- **MCP & Agent Engine**: Model Context Protocol tool routing and multi-agent execution tracking.

---

## 2. Frontend Architecture

The frontend is built using Next.js (App Router), React, TypeScript, and Tailwind CSS v4, strictly implementing the **Merlin Design System**.

### Technology Stack
- **Framework**: Next.js 14+ (App Router, Server & Client Components)
- **Styling**: Tailwind CSS v4 + Vanilla CSS Custom Tokens
- **Typography**: Inter (Google Font) + Handwritten Accent Font (`#34c759` annotations)
- **State Management**: Zustand / React Query (TanStack Query v5)
- **Visualization**: Recharts (Custom themed for paper white canvas & signal green accents)
- **Icons**: Lucide React (Clean, minimal stroke icons matching `--color-steel-gray`)

### Merlin Design Tokens & Theme Specification
```css
:root {
  --color-paper-white: #f5f5f4;
  --color-card-snow: #ffffff;
  --color-blush-mist: #fdf8f7;
  --color-ink-black: #000000;
  --color-body-charcoal: #1c1d1f;
  --color-steel-gray: #6a6b6c;
  --color-graphite: #808080;
  --color-ash: #aaaaaa;
  --color-hairline: #cccccc;
  --color-mist: #dddddd;
  --color-cloud: #eeeeee;
  --color-signal-green: #34c759;
  --color-link-blue: #3575f8;
  --gradient-dawn-wash: linear-gradient(180deg, rgb(150, 223, 255) 0%, rgb(237, 237, 237) 58.17%, rgb(221, 221, 221) 100%);
  
  --font-inter: 'Inter', system-ui, sans-serif;
  --font-handwritten: 'Caveat', 'Reenie Beanie', cursive;

  --radius-cards: 20px;
  --radius-inputs: 12.5px;
  --radius-buttons: 100px;
  --radius-nav-capsule: 100px;
  --radius-product-mockup: 30px;

  --shadow-subtle: rgb(235, 232, 233) 1px 3px 1px 0px;
  --shadow-sm: rgb(238, 238, 238) 0px 3px 8px 0px;
  --shadow-xl: rgba(0, 0, 0, 0.25) 0px 40px 60px 0px;
}
```

### Key Interface Modules
1. **Floating Capsule Navigation**: Bottom-centered nav pill containing organization switcher, top-level section links, user badge, and Signal Green CTA button.
2. **Executive Overview Dashboard**: Total cost tracking, active requests, latency percentiles (P50/P90/P99), error rate, top models breakdown, spend velocity charts.
3. **Virtual Key Manager**: Generation of `wg-live-...` keys, budget allocation, permission scope configuration, instant revocation.
4. **Model Registry & Dynamic Routing View**: Model availability status, priority chains, fallback rule visualizer, cost-per-million-tokens table.
5. **Interactive AI Playground**: Multi-model side-by-side prompt testing, temperature sliders, latency timer, raw JSON response inspector.
6. **Guardrails & Security Panel**: PII masking rules, toxic content filters, banned phrase list, violation logs.
7. **MCP Tools & Agents Registry**: Register external MCP servers, tool schemas, and active agent execution monitors.

---

## 3. Backend Architecture

The backend is built as an asynchronous Python service using **FastAPI**, **uvicorn**, **SQLAlchemy 2.0 (AsyncIO)**, and **httpx**.

```
+-------------------------------------------------------------------------+
|                          FastAPI Application                            |
|                                                                         |
|  +-----------------------+   +-------------------+   +---------------+  |
|  | Gateway Proxy Router  |   | Management API    |   | Admin API     |  |
|  | /v1/chat/completions  |   | /api/v1/keys      |   | /api/v1/admin |  |
|  | /v1/models            |   | /api/v1/budgets   |   | /api/v1/orgs  |  |
|  +-----------------------+   +-------------------+   +---------------+  |
|              |                         |                     |          |
|              +-------------------------+---------------------+          |
|                                        |                                |
|  +-------------------------------------------------------------------+  |
|  |                        Middleware Engine                          |  |
|  | KeyAuthMiddleware -> RateLimitMiddleware -> GuardrailMiddleware   |  |
|  +-------------------------------------------------------------------+  |
|                                        |                                |
|  +-------------------------------------------------------------------+  |
|  |                     Gateway Pipeline Core                         |  |
|  |   ModelResolver -> RouterEngine -> ProviderClient -> CostEngine   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
       |                        |                         |
       v                        v                         v
+--------------+        +---------------+        +------------------+
| PostgreSQL   |        | Redis Cache   |        | Async Task Queue |
| (Data Store) |        | (Limits/Keys) |        | (Celery / ARQ)   |
+--------------+        +---------------+        +------------------+
```

### Module Breakdown
- `app.api.v1`: OpenAI-compatible gateway endpoints (`chat.py`, `models.py`, `embeddings.py`) and Management REST API.
- `app.core.security`: Key hashing (`Argon2id`), Fernet key encryption for provider API keys, JWT access tokens.
- `app.core.ratelimit`: Redis sliding-window token bucket algorithm.
- `app.services.providers`: Provider-specific adapter classes implementing a unified `BaseProviderAdapter` contract:
  - `OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`, `GroqAdapter`, `OllamaAdapter`, `CustomAdapter`.
- `app.services.routing`: Weighted round-robin, least-latency, cost-optimized, and strict-priority failover routing algorithms.
- `app.services.guardrails`: Regex engine, regex/keyword masker, LLM-based safety verifier.
- `app.services.cost`: Dynamic token accounting and provider price mapping database lookup.

---

## 4. Database Architecture

The data storage layer uses **PostgreSQL 16** managed via SQLAlchemy 2.0 async ORM and Alembic migrations.

### Key Data Domain Modules
1. **Tenancy & Core Identity**: `users`, `organizations`, `teams`, `projects`, `audit_logs`
2. **Providers & Credentials**: `providers`, `provider_credentials` (encrypted payload)
3. **Models & Deployments**: `models`, `model_deployments`
4. **Virtual Security Keys**: `api_keys`, `api_key_permissions`
5. **Gateway Routing & Policies**: `routing_rules`, `fallback_rules`, `guardrails`, `guardrail_policies`
6. **Limits & Financial Governance**: `budgets`, `rate_limits`, `spend_records`
7. **Telemetry & Audit**: `request_logs`, `token_usages`
8. **Integrations**: `mcp_servers`, `mcp_tools`, `agents`

*(Full schema details, indexes, foreign key cascading, and DDL scripts are provided in `/docs/WHITEGATOR_DATABASE.md`)*

---

## 5. Authentication Architecture

WhiteGator supports two authentication layers:

### Management Interface Auth
- **JWT (JSON Web Tokens)**: Short-lived RS256 / HS256 access tokens with HTTP-only refresh cookies.
- **Session Management**: Session revocation via Redis token blacklist.
- **Role-Based Access Control (RBAC)**:
  - `SUPER_ADMIN`: Full platform configuration.
  - `ORG_ADMIN`: Organization settings, provider credential configuration, budgets.
  - `TEAM_MANAGER`: Project creation, team member management, key allocation.
  - `DEVELOPER`: API key creation within project limits, playground access, logs view.
  - `VIEWER`: Read-only analytics access.

### Gateway API Key Auth
- **Prefix Format**: `wg-live-[32_hex_chars]` (e.g. `wg-live-8f92a1b0c9e7...`).
- **Hashing**: Incoming key string is SHA-256 hashed immediately upon receipt. Only the hash `key_hash` is stored in DB/Redis.
- **Redis Cache**: Resolved key details (project_id, active status, rate limits, remaining budget) cached in Redis for fast verification (<1ms).

---

## 6. Organization & Team Architecture

WhiteGator establishes strict multi-tenant governance hierarchy:

```
[Organization]
   │
   ├── [Team A (Engineering)]
   │     ├── [Project 1 (Customer Support Bot)]
   │     │     ├── API Key 1 ($100 budget cap)
   │     │     └── API Key 2 ($50 budget cap)
   │     └── [Project 2 (Internal Search)]
   │           └── API Key 3
   │
   └── [Team B (Data Science)]
         └── [Project 3 (Model Benchmarking)]
               └── API Key 4
```

- Each API request is deterministically mapped to a specific `Organization`, `Team`, `Project`, and `ApiKey`.
- Budgets and Rate Limits can be attached at the Organization level, Team level, Project level, or Key level.

---

## 7. AI Provider Architecture

The AI Provider layer normalizes disparate LLM vendor protocol differences into a unified standard internal schema matching the OpenAI Chat Completion spec.

### Provider Adapter Contract (`BaseProviderAdapter`)
```python
class BaseProviderAdapter(ABC):
    @abstractmethod
    async def chat_completion(
        self, payload: GatewayChatPayload, credential: ProviderCredential
    ) -> GatewayChatResponse:
        pass

    @abstractmethod
    async def chat_completion_stream(
        self, payload: GatewayChatPayload, credential: ProviderCredential
    ) -> AsyncGenerator[GatewayStreamChunk, None]:
        pass
```

### Supported Providers & Adapters
1. **OpenAI Adapter**: Direct passthrough to `https://api.openai.com/v1` with usage metadata extraction.
2. **Anthropic Adapter**: Converts OpenAI messages to `/v1/messages` format (system prompt separation, `claude-3` role schema), converts SSE streaming events back to OpenAI chunks.
3. **Google Gemini Adapter**: Translates OpenAI payload to Gemini REST payload (`contents`, `parts`), handles `gemini-1.5-pro` & `gemini-2.0-flash`.
4. **Groq Adapter**: High-speed Llama 3 / Mixtral provider passthrough.
5. **Ollama / Self-Hosted Adapter**: Local LLM endpoint connection without API key requirement.
6. **Generic OpenAI-Compatible Adapter**: Supports vLLM, TGI, Anyscale, Together AI, DeepSeek endpoints.

---

## 8. Model Registry Architecture

The Model Registry maintains a catalog of available physical models and maps virtual aliases (e.g. `smart-model`, `fast-model`, `code-assistant`) to specific model deployments.

### Capabilities
- **Model Definition**: Unique model IDs, provider mapping, default parameters, context length limits, modality support (text, vision, audio).
- **Virtual Aliases**: Virtual model routing (e.g. mapping `gpt-4o` request to `claude-3-5-sonnet` if provider key for OpenAI is unavailable).
- **Cost Table Registry**: Per-model prompt token cost per 1M tokens, completion token cost per 1M tokens, updated dynamically.

---

## 9. AI Gateway Architecture

The Gateway engine handles high-throughput HTTP/SSE proxying with low latency overhead (<5ms proxy latency overhead).

### Core Pipeline Flow
1. **HTTP Listener**: Intercepts requests to `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`.
2. **Streaming Engine**: Asynchronous Server-Sent Events (SSE) generator yielding standard `data: {...}` lines with usage end-frames.
3. **Async Connection Pool**: Reusable HTTP/2 connections managed via `httpx.AsyncClient` with keep-alive limits to minimize TLS handshake overhead.

---

## 10. Routing Engine

WhiteGator supports 4 distinct routing algorithms per project or routing rule:

1. **Priority Cascade (Primary/Fallback)**: Route to Deployment 1; if unavailable, try Deployment 2.
2. **Weighted Load Distribution**: Distribute traffic randomly based on relative weights (e.g. 80% OpenAI `gpt-4o`, 20% Groq `llama-3.3-70b`).
3. **Cost-Optimized Routing**: Automatically select the deployment with the lowest cost per token that satisfies the requested model capabilities.
4. **Latency-Based Routing**: Dynamically select deployment based on real-time rolling P90 latency measurements stored in Redis.

---

## 11. Retry & Fallback System

When an upstream provider call fails:

```
[Gateway Engine]
       │
       ▼
Attempt Call (Deployment #1) ───[Success]───► Return Response
       │
       ├─ ( HTTP 429 Rate Limit / 5xx Server Error / Timeout )
       ▼
Evaluate Retry / Fallback Rules
       │
       ├─ Retry same deployment (Exponential backoff + random jitter)
       │
       └─ Switch to Fallback Deployment #2 (e.g. OpenAI -> Anthropic)
             │
             ▼
Attempt Call (Deployment #2) ───[Success]───► Return Response
             │
             └─ Failed after N attempts ───► Return Structured Gateway Error (HTTP 502)
```

- Configurable max retries (default: 3).
- Exponential backoff with jitter (`delay = min(max_delay, base * 2^attempt) + jitter`).
- Fallback triggers: `429 Rate Limited`, `500/502/503 Provider Error`, `Timeout`, `Context Length Exceeded`.

---

## 12. Virtual API Key System

Virtual keys (`ApiKey`) decouple client applications from vendor keys.

### Key Attributes
- `key_hash`: Cryptographic hash stored in DB/Redis.
- `key_prefix`: Public identifier for tracking (e.g. `wg-live-8f92a1b0`).
- `budget_limit`: Hard spending ceiling in USD (e.g. `$50.00`).
- `rate_limit_rpm` / `rate_limit_tpm`: Custom request & token caps.
- `allowed_models`: Array of allowed model IDs (e.g. `["gpt-4o-mini", "claude-3-5-haiku"]`).
- `is_active` & `expires_at`: Operational status control.

---

## 13. Rate Limiting System

Implemented using **Redis Sliding Window Token Bucket** scripts (Lua) for zero race conditions across distributed gateway instances.

### Dimensions Managed
- **Requests Per Minute (RPM)**
- **Tokens Per Minute (TPM)**
- **Requests Per Day (RPD)**
- **Tokens Per Day (TPD)**

When a rate limit is hit, the Gateway returns a standard HTTP 429 response with headers:
- `X-RateLimit-Limit-RPM`
- `X-RateLimit-Remaining-RPM`
- `X-RateLimit-Reset`

---

## 14. Token Tracking System

Accurate token accounting is essential for cost management and billing.

### Token Extraction Strategy
1. **Provider Metadata First**: Read `usage.prompt_tokens` and `usage.completion_tokens` directly from provider response payloads if returned.
2. **Tokenizer Engine Fallback**: If provider does not return usage (or during streaming before end-chunk), calculate prompt tokens using `tiktoken` for OpenAI/Anthropic/generic models or character ratio estimation fallback (1 token ≈ 4 chars).
3. **Stream Aggregation Engine**: Accumulate token counts across all streamed SSE chunks and emit final usage log upon completion.

---

## 15. Cost Calculation System

Calculates real-time financial expenditure per request.

### Pricing Formula
$$\text{Cost} = \left( \frac{\text{Prompt Tokens}}{1,000,000} \times \text{Price}_{\text{prompt}} \right) + \left( \frac{\text{Completion Tokens}}{1,000,000} \times \text{Price}_{\text{completion}} \right)$$

- Custom markup overrides supported per project or API key (e.g., charge internal teams a 10% infrastructure margin).
- Multi-currency architecture with base storage in micro-USD ($1/1,000,000).

---

## 16. Budget Management Engine

Enforces financial governance across Organizations, Teams, Projects, and Virtual Keys.

### Capabilities
- **Soft Limits**: Triggers warning webhooks and UI notifications when spending reaches threshold (e.g. 80% of budget).
- **Hard Limits**: Instantly rejects new incoming API requests with HTTP 429 / 402 once budget is exhausted.
- **Reset Schedules**: Automatic periodic budget resets (`NEVER`, `DAILY`, `WEEKLY`, `MONTHLY`).

---

## 17. Request Logging System

Logs detailed request and response metadata asynchronously without slowing down the proxy gateway response path.

```
[Gateway Response Handshake Complete]
                 │
                 ▼
Push Log Payload to Async In-Memory / Redis Queue
                 │
                 ▼
   Background Worker Batch Ingestion
                 │
                 ▼
PostgreSQL `request_logs` Table Insert
```

### Log Data Captured
- Request ID (`req_...`)
- Timestamp & Duration (ms)
- Organization, Team, Project, API Key IDs
- Model requested vs Model actual executed
- Provider & Deployment used
- Status code & Error message (if applicable)
- Prompt tokens, Completion tokens, Total tokens
- Exact calculated cost ($USD)
- Guardrail execution flags & PII redacting status
- Optional payload capture (configurable privacy levels: full, metadata-only, zero-store)

---

## 18. Observability System

- **Metrics (Prometheus format at `/metrics`)**:
  - `whitegator_requests_total{provider, model, status}`
  - `whitegator_request_duration_seconds{provider, model}`
  - `whitegator_tokens_total{type="prompt|completion", model}`
  - `whitegator_cost_dollars_total{organization, project}`
  - `whitegator_active_connections`
- **Health Checks (`/health`, `/health/liveness`, `/health/readiness`)**:
  - Redis connection state
  - PostgreSQL pool health
  - Upstream provider availability probes

---

## 19. Guardrail Architecture

Guardrails run in the request pipeline before model invocation and after provider response generation.

```
Incoming Request
       │
       ▼
[Pre-Request Guardrail Policy]
  ├─ PII Masking (SSN, Credit Cards, Email, API Keys via Regex/NER)
  ├─ Prompt Injection Detection (Pattern matching / heuristic scoring)
  └─ Toxic / Blocked Phrase Filter
       │
       ▼ (Passed or Cleaned Payload)
Provider Invocation
       │
       ▼
[Post-Request Guardrail Policy]
  ├─ Response PII Sanitization
  └─ Output Structure / JSON Schema Validation
       │
       ▼
Final Client Response
```

---

## 20. AI Playground

An interactive web workspace for testing models and routing configurations in real-time.

### Capabilities
- Single prompt execution against multiple models simultaneously.
- Parameter tweaking: Temperature, Top-P, Max Tokens, System Prompt, Frequency Penalty.
- Token count preview & real-time cost estimation before sending request.
- Side-by-side response comparison (latency, speed tps, cost, output quality).

---

## 21. MCP (Model Context Protocol) Integration Architecture

WhiteGator embeds native support for Anthropic's **Model Context Protocol (MCP)**.

```
[Client / Agent] ───► [WhiteGator Gateway]
                             │
                             ├── Resolves MCP Tools from Registered Servers
                             ├── Inject Tools into Chat Completion Request Schema
                             ▼
                    [Upstream Provider]
                             │
                             ├── Returns Tool Call Request (`tool_calls`)
                             ▼
                    [WhiteGator MCP Execution Engine]
                             │
                             ├── Dispatches Execution to Target MCP Server (SSE / StdIO)
                             ├── Receives Tool Result
                             ▼
                    [Re-invokes Provider with Tool Result]
                             │
                             ▼
                    Final Response to Client
```

---

## 22. Agent Integration Architecture

WhiteGator provides dedicated tracking for multi-agent workflows (e.g. LangChain, AutoGen, CrewAI, LlamaIndex agents).

- **Agent Sessions**: Group multi-turn API calls under an `agent_id` and `session_id`.
- **Hierarchical Cost Tracking**: Aggregate total cost spent by a single autonomous agent task run.
- **Max Depth & Step Limits**: Enforce circuit breakers if an agent enters an infinite loop (e.g. max 25 tool executions per session).

---

## 23. Admin Architecture

System Administration capabilities for platform operators:
- **Tenant Management**: Provisioning new organizations, managing subscription tiers.
- **Provider Credentials Key Vault**: Encrypted master key storage across providers.
- **Global Rate & Cost Override**: Platform-wide throttling controls during traffic spikes.
- **Audit Logs**: Immutable log of administrative actions (key creation, credential edits, budget changes).

---

## 24. Security Architecture

- **Data at Rest Encryption**: Sensitive keys (OpenAI API key, Anthropic API key, DB secrets) encrypted using AES-256-GCM / Fernet with master key from environment variables.
- **Data in Transit**: Enforcement of TLS 1.3 for all external client-gateway and gateway-provider connections.
- **Key Hashing**: All virtual gateway keys hashed via SHA-256 (`key_hash`). Plaintext keys displayed ONCE at creation.
- **CORS & Headers**: Strict CORS origin validation, OWASP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).

---

## 25. Production Deployment Architecture

Designed for high-availability cloud container deployment.

```
                        [ Nginx Reverse Proxy / Load Balancer ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    [ WhiteGator Gateway App #1 ]           [ WhiteGator Gateway App #2 ]
    (FastAPI / Uvicorn Workers)             (FastAPI / Uvicorn Workers)
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
  [ PostgreSQL Database ]     [ Redis Cluster ]     [ Async Worker Queue ]
  (Primary + Read Replica)   (Limits/Cache/PubSub)    (Log Batch & Webhooks)
```

### Docker Compose Stack Layout
- `web`: Next.js frontend container (Node.js 20, port 3000)
- `api`: FastAPI gateway container (Python 3.12, Uvicorn, port 8000)
- `db`: PostgreSQL 16 database (port 5432)
- `redis`: Redis 7 in-memory cache (port 6379)
- `worker`: Background task worker for log batching & webhook dispatch
