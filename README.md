# WhiteGator AI Gateway Platform

**WhiteGator** is an original, production-grade AI Infrastructure Gateway and Orchestration Platform built for unified LLM access, virtual key governance, dynamic latency routing, enterprise security guardrails, and real-time financial cost control.

Designed with **Merlin Aesthetics**—a paper-white canvas (`#f5f5f4`), dark charcoal typography (`#1c1d1f`), Signal Green accent (`#34c759`), floating pill capsule navigation, and handwritten annotation callouts.

---

## 🚀 Technology Architecture

```
/apps
  /web                  # Next.js 14+ (React, TypeScript, Tailwind CSS v4, Merlin UI)
  /api                  # FastAPI 0.110+ (Python 3.12, AsyncIO, SQLAlchemy 2.0, Redis)

/packages
  /shared               # Shared constants & formatting utilities
  /types                # Shared TypeScript interface contracts

/infrastructure
  /docker               # Dockerfile.api, Dockerfile.web, docker-compose.yml

/docs                   # WHITEGATOR_ARCHITECTURE.md, WHITEGATOR_DATABASE.md, WHITEGATOR_API.md, WHITEGATOR_IMPLEMENTATION_PLAN.md
```

---

## 🛠 Local Setup & Running Instructions

### Option 1: Development Servers (Standalone Local Running)

1. **Start the FastAPI Backend Service (Port 8000)**:
   ```bash
   cd apps/api
   python -m pip install -r requirements.txt
   $env:PYTHONPATH="."
   python app/main.py
   ```
   * The FastAPI server will automatically start, seed initial default providers/models/demo keys, and be accessible at:
     * Interactive Swagger OpenAPI Docs: `http://localhost:8000/docs`
     * System Health Check: `http://localhost:8000/health`

2. **Start the Next.js Frontend Dashboard (Port 3000)**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   * Open `http://localhost:3000` in your web browser.

---

### Option 2: Production Docker Compose Setup

Run the full container stack (Next.js web, FastAPI backend, PostgreSQL 16 database, Redis 7 cache) with a single command:

```bash
docker compose up --build
```

Services will automatically initialize:
* **Next.js Web Console**: `http://localhost:3000`
* **FastAPI Gateway Proxy**: `http://localhost:8000`
* **PostgreSQL Database**: `localhost:5432`
* **Redis Cache**: `localhost:6379`

---

## 🧪 Running Automated Tests

To execute the backend health and database test suite:

```bash
$env:PYTHONPATH="apps/api"
python -m pytest apps/api/tests/test_health.py
```

---

## 📌 Phase 1 Completion Summary

- **Monorepo Architecture**: Clean separation (`/apps/web`, `/apps/api`, `/packages/shared`, `/packages/types`, `/infrastructure/docker`, `/docs`).
- **Backend**: FastAPI async architecture, connection pooling, seed script, centralized exception handler, structured logger.
- **Database & Cache**: SQLAlchemy ORM models with SQLite local fallback and PostgreSQL container configuration; Redis cache abstraction layer.
- **Frontend Pages & Merlin UI**:
  - `/` (Overview Landing page with Dawn Wash atmospheric gradient & Signal Green CTAs)
  - `/login` (Sign-in form)
  - `/register` (Workspace registration)
  - `/dashboard` (Executive Overview Dashboard displaying real backend health & DB metrics)
- **Health Checks**:
  - `GET /health`
  - `GET /health/database`
  - `GET /health/redis`
