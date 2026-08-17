from datetime import datetime, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import jwt
from app.database import get_db
from app.models import User, Organization, OrganizationMember, Project, Team
from app.config import settings

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Decodes JWT access token and returns authenticated active user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or suspended")
    
    return user

def verify_org_access(org_id: str, user: User, db: Session, required_roles: Optional[List[str]] = None) -> OrganizationMember:
    """
    Enforces strict multi-tenant organization isolation and RBAC role authorization.
    Role Hierarchy: owner > admin > developer > viewer.
    """
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user.id
    ).first()

    if not member:
        # Cross-organization access prevention
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You do not belong to this organization"
        )

    if required_roles:
        # Role hierarchy normalization
        role_hierarchy = {"owner": 4, "admin": 3, "developer": 2, "viewer": 1}
        user_role_score = role_hierarchy.get(member.role.lower(), 0)
        
        # Determine minimum required level
        min_required_score = max([role_hierarchy.get(r.lower(), 0) for r in required_roles])
        
        if user_role_score < min_required_score:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"RBAC Permission Denied: Action requires '{required_roles}' role. Your role is '{member.role}'."
            )

    return member

def verify_project_access(project_id: str, user: User, db: Session, required_roles: Optional[List[str]] = None) -> Project:
    """Verifies user has valid organization access to the requested project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_org_access(project.organization_id, user, db, required_roles)
    return project
