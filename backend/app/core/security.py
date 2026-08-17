import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
import jwt
from cryptography.fernet import Fernet
from app.core.config import settings

# Fernet key generator or static key padding
def _get_fernet_key() -> bytes:
    # Hash the settings secret key to obtain 32 bytes for Fernet base64 key
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    import base64
    return base64.urlsafe_b64encode(key)

fernet = Fernet(_get_fernet_key())

def hash_password(password: str) -> str:
    # High-security salted SHA-256 hash for portable execution without C-extension dependencies
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if ":" not in hashed_password:
            return False
        salt, expected_hash = hashed_password.split(":", 1)
        actual_hash = hashlib.sha256((salt + plain_password).encode()).hexdigest()
        return secrets.compare_digest(expected_hash, actual_hash)
    except Exception:
        return False

def generate_api_key() -> tuple[str, str, str]:
    """Generates (plaintext_key, key_prefix, key_hash)"""
    hex_token = secrets.token_hex(24)  # 48 chars
    plaintext = f"wg-live-{hex_token}"
    key_prefix = plaintext[:16]  # e.g., "wg-live-8f92a1b0"
    key_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    return plaintext, key_prefix, key_hash

def hash_key_string(plaintext_key: str) -> str:
    return hashlib.sha256(plaintext_key.encode()).hexdigest()

def encrypt_credential(secret: str) -> str:
    if not secret:
        return ""
    return fernet.encrypt(secret.encode()).decode()

def decrypt_credential(encrypted_secret: str) -> str:
    if not encrypted_secret:
        return ""
    try:
        return fernet.decrypt(encrypted_secret.encode()).decode()
    except Exception:
        return encrypted_secret

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        return None
