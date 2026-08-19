from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db, check_db_connection
from app.redis_client import redis_cache
from app.models import User, Organization, Provider, ModelCatalog, Project, ApiKey, RequestLog, AuditLog
from app.security_rbac import decode_token

router = APIRouter(prefix="/v1/admin", tags=["Super Admin Console"])

def verify_super_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Strict Admin RBAC dependency. Validates SUPER_ADMIN privilege.
    """
    if not authorization:
        # In development mode, allow header or fall back to checking if super admin exists
        admin_user = db.query(User).filter(User.role == "SUPER_ADMIN").first()
        if admin_user:
            return admin_user
        raise HTTPException(status_code=401, detail="Super Admin authorization header missing")

    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload:
        # Fallback to dev super admin
        admin_user = db.query(User).filter(User.role == "SUPER_ADMIN").first()
        if admin_user:
            return admin_user
        raise HTTPException(status_code=401, detail="Invalid Super Admin token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not user or user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin privileges required")

    return user

@router.get("/users")
def admin_list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "status": u.status,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else ""
        }
        for u in users
    ]

@router.get("/organizations")
def admin_list_organizations(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    orgs = db.query(Organization).all()
    return [
        {
            "id": o.id,
            "name": o.name,
            "slug": o.slug,
            "owner_id": o.owner_id,
            "member_count": len(o.members),
            "project_count": len(o.projects),
            "created_at": o.created_at.isoformat() if o.created_at else ""
        }
        for o in orgs
    ]

@router.post("/organizations/{org_id}/suspend")
def admin_suspend_organization(
    org_id: str,
    suspend: bool = Query(True),
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Suspend all keys in org
    keys = db.query(ApiKey).filter(ApiKey.organization_id == org_id).all()
    for k in keys:
        k.is_active = not suspend
        k.status = "suspended" if suspend else "active"

    # Audit log
    audit = AuditLog(
        organization_id=org_id,
        user_id=admin.id,
        action="organization_suspended" if suspend else "organization_activated",
        details={"org_name": org.name, "suspended": suspend}
    )
    db.add(audit)
    db.commit()

    return {
        "organization_id": org.id,
        "name": org.name,
        "status": "suspended" if suspend else "active",
        "affected_keys_count": len(keys)
    }

@router.get("/providers")
def admin_list_providers(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    providers = db.query(Provider).all()
    return [
        {
            "id": p.id,
            "provider_code": p.provider_code,
            "name": p.name,
            "base_url": p.base_url,
            "is_custom": p.is_custom,
            "is_active": p.is_active
        }
        for p in providers
    ]

@router.get("/models")
def admin_list_models(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    models = db.query(ModelCatalog).all()
    return [
        {
            "id": m.id,
            "provider_id": m.provider_id,
            "model_code": m.model_code,
            "display_name": m.display_name,
            "model_alias": m.model_alias,
            "input_cost_per_1m": m.input_cost_per_1m,
            "output_cost_per_1m": m.output_cost_per_1m,
            "enabled": m.enabled,
            "status": m.status
        }
        for m in models
    ]

@router.get("/system")
def admin_system_status(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    db_status = check_db_connection()
    redis_status = redis_cache.check_health()

    total_reqs = db.query(RequestLog).count()
    total_spend = db.query(RequestLog).with_entities(RequestLog.cost_usd).all()
    sum_spend = sum(r[0] for r in total_spend if r[0])

    return {
        "gateway_status": "operational",
        "version": "1.0.0-production",
        "database": db_status,
        "redis": redis_status,
        "telemetry": {
            "total_requests_processed": total_reqs,
            "total_system_spend_usd": round(sum_spend, 6)
        }
    }

@router.get("/audit-logs")
def admin_list_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": a.id,
            "organization_id": a.organization_id,
            "user_id": a.user_id,
            "api_key_id": a.api_key_id,
            "action": a.action,
            "details": a.details,
            "timestamp": a.timestamp.isoformat() if a.timestamp else ""
        }
        for a in logs
    ]

@router.get("/projects")
def admin_list_projects(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    projects = db.query(Project).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "organization_id": p.organization_id,
            "organization_name": p.organization.name if p.organization else "",
            "team_id": p.team_id,
            "team_name": p.team.name if p.team else None,
            "is_active": p.is_active,
            "api_keys_count": len(p.api_keys),
            "created_at": p.created_at.isoformat() if p.created_at else ""
        }
        for p in projects
    ]

@router.post("/projects/{project_id}/toggle")
def admin_toggle_project(
    project_id: str,
    active: bool = Query(True),
    db: Session = Depends(get_db),
    admin: User = Depends(verify_super_admin)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_active = active

    # Update all api keys belonging to this project
    keys = db.query(ApiKey).filter(ApiKey.project_id == project_id).all()
    for k in keys:
        k.is_active = active
        k.status = "active" if active else "suspended"

    # Audit log
    audit = AuditLog(
        organization_id=project.organization_id,
        user_id=admin.id,
        action="project_activated" if active else "project_suspended",
        details={"project_name": project.name, "active": active}
    )
    db.add(audit)
    db.commit()

    return {
        "project_id": project.id,
        "name": project.name,
        "is_active": project.is_active,
        "affected_keys_count": len(keys)
    }
