from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from app.config import settings
from app.logging_config import logger
from app.seed import seed_database
from app.routers import health, auth, dashboard, tenancy, gateway, api_keys, analytics, mcp, agents, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "An internal server error occurred in WhiteGator API.",
                "type": "internal_server_error",
                "detail": str(exc) if settings.ENVIRONMENT == "development" else None
            }
        }
    )

# Custom Swagger UI & OpenAPI routes for /api prefix
@app.get("/api/docs", include_in_schema=False)
@app.get("/api/v1/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        init_oauth=app.swagger_ui_init_oauth,
    )

@app.get("/api/redoc", include_in_schema=False)
async def custom_redoc_html():
    return get_redoc_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} - ReDoc",
    )

@app.get("/api/openapi.json", include_in_schema=False)
async def custom_openapi():
    return JSONResponse(content=app.openapi())

# Root status handlers
@app.get("/", include_in_schema=False)
@app.get("/api", include_in_schema=False)
async def api_root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/api/docs",
        "redoc_url": "/api/redoc",
        "openapi_url": "/api/openapi.json"
    }

# Include all routers under both root and /api prefixes so any reverse proxy configuration works
api_routers = [
    gateway.router,
    api_keys.router,
    analytics.router,
    mcp.router,
    agents.router,
    admin.router,
    health.router,
    auth.router,
    tenancy.router,
    dashboard.router,
]

for r in api_routers:
    app.include_router(r)
    app.include_router(r, prefix="/api")

@app.on_event("startup")
def startup_event():
    logger.info("Initializing WhiteGator API server...")
    seed_database()
    logger.info("WhiteGator API startup complete.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
