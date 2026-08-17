import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "WhiteGator AI Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "whitegator_super_secret_jwt_and_encryption_master_key_2026_x90")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for dev ease

    # Database: Supports SQLite fallback out of the box or PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./whitegator.db")

    # Master encryption key for provider credentials (32 URL-safe base64-encoded bytes)
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "u7L9X3j-Z7aP9v1kR6m2W8q0Y4t5N1s8B3c6V9x2M5o=")

    class Config:
        case_sensitive = True

settings = Settings()
