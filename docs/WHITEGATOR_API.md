# WhiteGator AI Gateway — API Specification & Interface Reference

## Overview

WhiteGator provides two distinct API interfaces:

1. **OpenAI-Compatible Gateway API (`/v1/*`)**: Standard proxy endpoints designed for zero-code-change drop-in replacement in any application using official OpenAI SDKs, LangChain, AutoGen, or raw HTTP requests.
2. **Platform Management REST API (`/api/v1/*`)**: Administrative and operational REST interface for managing organizations, virtual API keys, budgets, dynamic routing rules, provider credentials, guardrails, and analytics.

---

## 1. OpenAI-Compatible Gateway Endpoints (`/v1/*`)

Authentication: Virtual API Key passed via `Authorization: Bearer wg-live-...` header.

### 1.1 Chat Completions (`POST /v1/chat/completions`)
Creates a model response for the given chat conversation. Supports both standard JSON payloads and Server-Sent Events (SSE) streaming (`stream: true`).

#### Request Headers
```http
Authorization: Bearer wg-live-8f92a1b0c9e74d...
Content-Type: application/json
```

#### Request Body
```json
{
  "model": "smart-model",
  "messages": [
    { "role": "system", "content": "You are a helpful AI infrastructure assistant." },
    { "role": "user", "content": "Explain how latency-based routing works in WhiteGator." }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false,
  "user": "user_app_client_123"
}
```

#### Response Body (Standard JSON — `200 OK`)
```json
{
  "id": "chatcmpl-wg-9f82b1c4",
  "object": "chat.completion",
  "created": 1773412800,
  "model": "claude-3-5-sonnet-20241022",
  "system_fingerprint": "fp_whitegator_v1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Latency-based routing in WhiteGator dynamically evaluates historical rolling P90 latency measurements across active provider deployments..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 128,
    "total_tokens": 160
  },
  "whitegator": {
    "request_id": "req_8f92a1b0c9e74d",
    "provider": "anthropic",
    "deployment_id": "dep_0a9b8c7d",
    "cost_usd": 0.002016,
    "latency_ms": 412
  }
}
```

#### SSE Streaming Event Format (`stream: true`)
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"id":"chatcmpl-wg-9f82b1c4","object":"chat.completion.chunk","created":1773412800,"model":"claude-3-5-sonnet-20241022","choices":[{"index":0,"delta":{"role":"assistant","content":"Latency"},"finish_reason":null}]}

data: {"id":"chatcmpl-wg-9f82b1c4","object":"chat.completion.chunk","created":1773412800,"model":"claude-3-5-sonnet-20241022","choices":[{"index":0,"delta":{"content":"-based"},"finish_reason":null}]}

data: {"id":"chatcmpl-wg-9f82b1c4","object":"chat.completion.chunk","created":1773412800,"model":"claude-3-5-sonnet-20241022","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":32,"completion_tokens":128,"total_tokens":160}}

data: [DONE]
```

---

### 1.2 Model Catalog (`GET /v1/models`)
Lists all available native models and virtual routing aliases accessible to the authenticated API key.

#### Response Body (`200 OK`)
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1700000000,
      "owned_by": "openai",
      "permission": [],
      "whitegator": {
        "display_name": "OpenAI GPT-4o",
        "is_virtual": false,
        "prompt_cost_per_1m": 2.50,
        "completion_cost_per_1m": 10.00,
        "context_window": 128000
      }
    },
    {
      "id": "smart-model",
      "object": "model",
      "created": 1700000000,
      "owned_by": "whitegator",
      "permission": [],
      "whitegator": {
        "display_name": "Smart Model Alias (Priority: Claude 3.5 Sonnet -> GPT-4o)",
        "is_virtual": true,
        "routing_strategy": "PRIORITY"
      }
    }
  ]
}
```

---

### 1.3 Embeddings (`POST /v1/embeddings`)
Generates vector embeddings for input text.

#### Request Body
```json
{
  "model": "text-embedding-3-small",
  "input": "WhiteGator AI Gateway infrastructure"
}
```

---

## 2. Platform Management REST API (`/api/v1/*`)

Authentication: JWT Access Token in header (`Authorization: Bearer <jwt_token>`).

### 2.1 Authentication & Profile (`/api/v1/auth`)

- `POST /api/v1/auth/login`: Authenticate with email/password, returns JWT token.
- `POST /api/v1/auth/register`: Initial admin/user registration.
- `GET /api/v1/auth/me`: Get active user profile and organization memberships.
- `POST /api/v1/auth/refresh`: Refresh expired JWT access token.

---

### 2.2 Organizations & Multi-Tenancy (`/api/v1/organizations`)

- `GET /api/v1/organizations`: List user organizations.
- `POST /api/v1/organizations`: Create new organization.
- `GET /api/v1/organizations/{org_id}`: Retrieve organization metadata.
- `GET /api/v1/organizations/{org_id}/teams`: List teams within organization.
- `POST /api/v1/organizations/{org_id}/teams`: Create new team.

---

### 2.3 Projects (`/api/v1/projects`)

- `GET /api/v1/projects?team_id={team_id}`: List team projects.
- `POST /api/v1/projects`: Create project workspace.
- `GET /api/v1/projects/{project_id}`: Retrieve project settings.

---

### 2.4 Virtual API Keys (`/api/v1/keys`)

- `GET /api/v1/keys?project_id={project_id}`: List virtual API keys.
- `POST /api/v1/keys`: Create new Virtual API key (`wg-live-...`). Returns plaintext key ONCE.
- `PUT /api/v1/keys/{key_id}`: Update key budget limit, rate limits, or allowed models.
- `DELETE /api/v1/keys/{key_id}`: Instantly revoke key.

#### Create Key Payload (`POST /api/v1/keys`)
```json
{
  "project_id": "proj_9a8b7c6d",
  "name": "Customer Support Production Key",
  "budget_usd": 150.00,
  "rate_limit_rpm": 120,
  "rate_limit_tpm": 200000,
  "allowed_models": ["gpt-4o-mini", "claude-3-5-haiku", "smart-model"],
  "expires_at": null
}
```

---

### 2.5 Provider Credentials (`/api/v1/providers`)

- `GET /api/v1/providers/catalog`: List system supported vendors (OpenAI, Anthropic, Gemini, Groq, Ollama, Custom).
- `GET /api/v1/providers/credentials`: List configured provider keys (masked).
- `POST /api/v1/providers/credentials`: Store encrypted provider API key.
- `DELETE /api/v1/providers/credentials/{cred_id}`: Remove provider key.

---

### 2.6 Model Catalog & Deployments (`/api/v1/models`)

- `GET /api/v1/models`: List physical models & active virtual aliases.
- `POST /api/v1/models`: Add custom or model deployment record.
- `POST /api/v1/models/deployments`: Configure deployment priorities and weights.

---

### 2.7 Dynamic Routing Rules (`/api/v1/routing`)

- `GET /api/v1/routing/rules`: List project routing rules.
- `POST /api/v1/routing/rules`: Create priority cascade, weighted load balance, or fallback policy.
- `PUT /api/v1/routing/rules/{rule_id}`: Update active routing strategy.

---

### 2.8 Guardrails & Security (`/api/v1/guardrails`)

- `GET /api/v1/guardrails`: List defined security guardrail policies.
- `POST /api/v1/guardrails`: Create PII masking rule, regex blocker, or prompt injection filter.
- `POST /api/v1/guardrails/attach`: Attach policy to project or API key.

---

### 2.9 Budgets & Spend Controls (`/api/v1/budgets`)

- `GET /api/v1/budgets`: View org/team/project budgets and spend status.
- `POST /api/v1/budgets`: Set monthly spending cap.
- `GET /api/v1/analytics/spend`: Historical spend velocity timeseries.

---

### 2.10 MCP Servers & Tools (`/api/v1/mcp`)

- `GET /api/v1/mcp/servers`: List registered MCP servers.
- `POST /api/v1/mcp/servers`: Register new MCP server endpoint (SSE URL / STDIO).
- `GET /api/v1/mcp/tools`: View aggregated list of discovered MCP tools.

---

### 2.11 Autonomous Agents (`/api/v1/agents`)

- `GET /api/v1/agents`: List agent registries.
- `POST /api/v1/agents`: Create autonomous agent profile with step limits & model bindings.
- `GET /api/v1/agents/{agent_id}/sessions`: View agent execution sessions & cost breakdowns.

---

### 2.12 Request Logs & Observability (`/api/v1/logs`)

- `GET /api/v1/logs`: Paginated search & filtering across historical request logs.
- `GET /api/v1/logs/{log_id}`: Detailed trace of a specific request ID (prompt/response payloads, latency breakdown, cost calculation).
- `GET /api/v1/analytics/summary`: Aggregate metrics dashboard (Total Requests, Tokens, USD Spent, P90 Latency, Error Rate).

---

### 2.13 Playground API (`/api/v1/playground`)

- `POST /api/v1/playground/execute`: Multi-model parallel testing request runner. Returns side-by-side completion results, token counts, and costs.
