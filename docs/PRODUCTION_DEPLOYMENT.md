# WhiteGator Production Deployment & Infrastructure Guide

## Architecture Overview

```text
Internet
   │
   ▼
[ HTTPS / SSL ]
   │
   ▼
[ Reverse Proxy / Load Balancer (Nginx / Caddy / Traefik) ]
   │
   ├───────────► WhiteGator Web (Next.js Dashboard - Port 3000)
   │
   └───────────► WhiteGator API / AI Gateway (FastAPI / Gunicorn - Port 8000)
                    │
                    ├───────────► PostgreSQL 16 (Primary Database)
                    │
                    └───────────► Redis 7 (Distributed Rate Limiting & Cache)
```

---

## 1. Local Development Setup
```bash
git clone https://github.com/whitegator/whitegater.git
cd whitegater

# Spin up local Redis & PostgreSQL services
docker-compose up -d

# Run FastAPI backend
cd apps/api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app/main.py

# Run Next.js frontend
cd ../web
npm install
npm run dev
```

---

## 2. Staging Deployment
Staging runs via Docker Compose with staging environment variables:
```bash
export ENVIRONMENT=staging
export SECRET_KEY=staging_secret_key_whitegator_2026
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 3. Production Deployment
Production utilizes Docker multi-stage builds with Gunicorn worker scaling:
```bash
cp .env.example .env.production
# Edit .env.production with real production secrets

docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --scale api=3
```

---

## 4. Environment Variables Reference

| Variable | Description | Required in Production |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production`, `staging`, `development` | Yes |
| `SECRET_KEY` | JWT signing secret (min 32 chars) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `POSTGRES_USER` | DB user | Yes |
| `POSTGRES_PASSWORD` | DB password | Yes |
| `POSTGRES_DB` | DB name | Yes |
| `REDIS_HOST` | Redis hostname | Yes |
| `REDIS_PORT` | Redis port (default 6379) | Yes |
| `REDIS_PASSWORD` | Redis authentication password | Yes |
| `ENCRYPTION_KEY` | Master credential AES encryption key | Yes |

---

## 5. Database Migration Strategy
Alembic or SQLAlchemy automatic schema migrations apply during startup:
```bash
# Manual migration command
python -m alembic upgrade head
```

---

## 6. Backup Strategy
Automated nightly PostgreSQL database dump:
```bash
# Nightly DB Backup Cron
0 2 * * * docker exec whitegator_postgres_prod pg_dump -U whitegator whitegator_prod | gzip > /backups/whitegator_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

---

## 7. Restore Strategy
```bash
gunzip -c /backups/whitegator_20260812_020000.sql.gz | docker exec -i whitegator_postgres_prod psql -U whitegator -d whitegator_prod
```

---

## 8. Scaling API & Gateway Workers
Scale Gunicorn concurrency per container:
```bash
# Gunicorn worker process count formula: (2 * CPU_CORES) + 1
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

---

## 9. Scaling Gateway Instances Horizontally
WhiteGator Gateway instances are stateless and scale horizontally behind a load balancer:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=5
```

---

## 10. Redis Requirements
- **Version**: Redis 7.0+
- **Memory**: Minimum 512MB RAM with `volatile-lru` eviction policy.
- **Latency**: Sub-millisecond network latency to Gateway nodes.

---

## 11. PostgreSQL Requirements
- **Version**: PostgreSQL 16+
- **Storage**: SSD with automatic WAL archiving.
- **Connections**: Minimum `max_connections = 200` with PgBouncer connection pooling.

---

## 12. HTTPS Configuration
All production traffic MUST be secured with TLS 1.3 using Let's Encrypt or AWS ACM.

---

## 13. Reverse Proxy (Nginx) Configuration
Sample Nginx config (`/etc/nginx/sites-available/whitegator.conf`):
```nginx
server {
    listen 443 ssl http2;
    server_name api.whitegator.ai;

    ssl_certificate /etc/letsencrypt/live/api.whitegator.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.whitegator.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 14. Observability & Health Checks
- Gateway health endpoint: `GET /health`
- Detailed admin telemetry: `GET /api/v1/admin/system`

---

## 15. Rollback Procedure
If a deployment fails:
1. Revert container image tag: `docker-compose -f docker-compose.prod.yml pull api:previous`
2. Restart service: `docker-compose -f docker-compose.prod.yml up -d --no-deps api`
3. Restore database snapshot if schema migration occurred.
