from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
from app.logging_config import logger

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {"connect_args": {"check_same_thread": False}} if is_sqlite else {
    "pool_pre_ping": True,
    "pool_size": 10,
    "max_overflow": 20
}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """Utility to test database health and connectivity"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database_type": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql"}
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}
