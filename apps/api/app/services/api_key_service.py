import secrets
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import ApiKey, AuditLog, RequestLog, Project, Organization
from app.logging_config import logger

class ApiKeyService:
    @staticmethod
    def generate_secret_key() -> str:
        """Generates a secure WhiteGator Virtual API Key (wg_live_<32-hex-chars>)."""
        random_hex = secrets.token_hex(16)
        return f"wg_live_{random_hex}"

    @staticmethod
    def hash_key(secret_key: str) -> str:
        """Hashes raw secret key with SHA-256."""
        return hashlib.sha256(secret_key.strip().encode("utf-8")).hexdigest()

    def create_key(
        self,
        db: Session,
        name: str,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None,
        created_by: Optional[str] = None,
        permissions: Optional[Dict[str, Any]] = None,
        limits: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Creates a new virtual API key. Returns the raw secret ONLY ONCE in the result.
        """
        raw_key = self.generate_secret_key()
        key_hash = self.hash_key(raw_key)
        prefix = raw_key[:12] # e.g. "wg_live_a1b2"

        default_permissions = {
            "models": ["*"],
            "endpoints": ["*"],
            "projects": ["*"],
            "organizations": ["*"]
        }
        if permissions:
            default_permissions.update(permissions)

        default_limits = {
            "rpm": 60,
            "tpm": 100000,
            "daily_budget": None,
            "monthly_budget": None,
            "max_request_size": 1048576
        }
        if limits:
            default_limits.update(limits)

        # Fallback to first org/project if not provided
        if not organization_id:
            org = db.query(Organization).first()
            organization_id = org.id if org else None
        if not project_id and organization_id:
            proj = db.query(Project).filter(Project.organization_id == organization_id).first()
            project_id = proj.id if proj else None

        api_key = ApiKey(
            organization_id=organization_id,
            project_id=project_id,
            created_by=created_by,
            key_prefix=prefix,
            key_hash=key_hash,
            name=name,
            status="active",
            expires_at=expires_at,
            permissions=default_permissions,
            limits=default_limits,
            budget_usd=default_limits.get("monthly_budget"),
            spend_usd=0.0,
            is_active=True
        )
        db.add(api_key)
        db.flush()

        # Audit log creation
        audit = AuditLog(
            organization_id=organization_id,
            user_id=created_by,
            api_key_id=api_key.id,
            action="key_created",
            details={"name": name, "key_prefix": prefix, "limits": default_limits, "permissions": default_permissions}
        )
        db.add(audit)
        db.commit()

        return {
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "secret_key": raw_key, # DISPLAYED ONLY ONCE AT CREATION
            "organization_id": api_key.organization_id,
            "project_id": api_key.project_id,
            "created_by": api_key.created_by,
            "status": api_key.status,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "permissions": api_key.permissions,
            "limits": api_key.limits,
            "created_at": api_key.created_at.isoformat()
        }

    def revoke_key(self, db: Session, key_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if not api_key:
            raise ValueError("API Key not found")

        api_key.status = "revoked"
        api_key.is_active = False
        
        audit = AuditLog(
            organization_id=api_key.organization_id,
            user_id=user_id,
            api_key_id=api_key.id,
            action="key_revoked",
            details={"key_prefix": api_key.key_prefix, "name": api_key.name}
        )
        db.add(audit)
        db.commit()

        return {
            "id": api_key.id,
            "name": api_key.name,
            "status": "revoked",
            "message": f"API key '{api_key.name}' was successfully revoked."
        }

    def rotate_key(self, db: Session, key_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Revokes the existing key and issues a fresh secret key with identical settings."""
        old_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if not old_key:
            raise ValueError("API Key not found")

        # Revoke old key
        old_key.status = "revoked"
        old_key.is_active = False

        # Create new rotated key
        new_key_data = self.create_key(
            db=db,
            name=f"{old_key.name} (Rotated)",
            organization_id=old_key.organization_id,
            project_id=old_key.project_id,
            created_by=user_id or old_key.created_by,
            permissions=old_key.permissions,
            limits=old_key.limits,
            expires_at=old_key.expires_at
        )

        audit = AuditLog(
            organization_id=old_key.organization_id,
            user_id=user_id,
            api_key_id=old_key.id,
            action="key_rotated",
            details={"old_key_id": old_key.id, "new_key_id": new_key_data["id"]}
        )
        db.add(audit)
        db.commit()

        return new_key_data

    def inspect_key(self, db: Session, key_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if not api_key:
            raise ValueError("API Key not found")

        audit = AuditLog(
            organization_id=api_key.organization_id,
            user_id=user_id,
            api_key_id=api_key.id,
            action="key_inspected",
            details={"key_prefix": api_key.key_prefix}
        )
        db.add(audit)
        db.commit()

        return {
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "organization_id": api_key.organization_id,
            "project_id": api_key.project_id,
            "created_by": api_key.created_by,
            "status": api_key.status,
            "is_active": api_key.is_active,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
            "permissions": api_key.permissions,
            "limits": api_key.limits,
            "spend_usd": round(api_key.spend_usd, 6),
            "created_at": api_key.created_at.isoformat()
        }

    def get_key_usage(self, db: Session, key_id: str) -> Dict[str, Any]:
        api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if not api_key:
            raise ValueError("API Key not found")

        total_reqs = db.query(RequestLog).filter(RequestLog.api_key_id == key_id).count()
        total_tokens = db.query(func.sum(RequestLog.total_tokens)).filter(RequestLog.api_key_id == key_id).scalar() or 0
        total_spend = db.query(func.sum(RequestLog.cost_usd)).filter(RequestLog.api_key_id == key_id).scalar() or 0.0

        return {
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "total_requests": total_reqs,
            "total_tokens": total_tokens,
            "total_spend_usd": round(total_spend, 6),
            "limits": api_key.limits,
            "status": api_key.status
        }

api_key_service = ApiKeyService()
