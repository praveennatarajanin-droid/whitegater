from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.logging_config import logger
from app.seed import seed_database
from app.routers import health, auth, dashboard, tenancy, gateway, api_keys, analytics, mcp, agents, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
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

# Include Routers
app.include_router(gateway.router)
app.include_router(api_keys.router)
app.include_router(analytics.router)
app.include_router(mcp.router)
app.include_router(agents.router)
app.include_router(admin.router)
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tenancy.router)
app.include_router(dashboard.router)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing WhiteGator API server...")
    seed_database()
    logger.info("WhiteGator API startup complete.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
