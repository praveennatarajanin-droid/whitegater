import os
import sys
from pydantic_settings import BaseSettings
from app.logging_config import logger

class Settings(BaseSettings):
    PROJECT_NAME: str = "WhiteGator AI Gateway API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_V1_STR: str = "/api/v1"
    
    # Secrets (Loaded from environment variables)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "whitegator_dev_secret_key_change_in_production_2026")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

    # Database
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "whitegator")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "whitegator_secret")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "whitegator_db")

    # DB Connection URL (PostgreSQL with SQLite fallback for instant local dev)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///./whitegator.db"
    )

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_URL: str = os.getenv("REDIS_URL", f"redis://{os.getenv('REDIS_HOST', 'localhost')}:6379/0")

    # Master encryption key for credentials
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "u7L9X3j-Z7aP9v1kR6m2W8q0Y4t5N1s8B3c6V9x2M5o=")

    def validate_environment(self):
        """Fails safely at startup if required secrets are unconfigured in production."""
        if self.ENVIRONMENT.lower() == "production":
            if "change_in_production" in self.SECRET_KEY:
                logger.critical("FATAL: Default SECRET_KEY detected in production environment!")
                raise ValueError("Production Startup Error: SECRET_KEY environment variable is invalid or unconfigured.")
            if "whitegator_secret" in self.POSTGRES_PASSWORD:
                logger.warning("SECURITY WARNING: Default POSTGRES_PASSWORD used in production.")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
settings.validate_environment()
