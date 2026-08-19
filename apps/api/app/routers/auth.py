import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Organization, OrganizationMember, Team, Project
from app.config import settings
from app.security_rbac import get_current_user
import jwt

router = APIRouter(prefix="/v1/auth", tags=["Authentication & Profile"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    status: str
    created_at: str
    last_login_at: Optional[str] = None

def hash_pass(password: str) -> str:
    salt = "whitegater_salt_2026"
    return f"{salt}:" + hashlib.sha256((salt + password).encode()).hexdigest()

def verify_pass(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, expected_hash = hashed_password.split(":", 1)
        actual_hash = hashlib.sha256((salt + plain_password).encode()).hexdigest()
        return secrets.compare_digest(expected_hash, actual_hash)
    except Exception:
        return False

def create_jwt_token(user_id: str) -> str:
    from datetime import datetime, timedelta, timezone
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": user_id}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account with this email already exists"
        )

    # Create User
    user = User(
        email=payload.email,
        password_hash=hash_pass(payload.password),
        full_name=payload.full_name,
        role="DEVELOPER",
        status="active",
        last_login_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.flush()

    # Create Primary Organization & set user as Owner
    org_name = payload.organization_name or f"{payload.full_name}'s Org"
    org_slug = f"org-{secrets.token_hex(4)}"
    org = Organization(
        name=org_name,
        slug=org_slug,
        owner_id=user.id
    )
    db.add(org)
    db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner"
    )
    db.add(member)
    db.flush()

    # Create Default Team & Default Project
    team = Team(
        organization_id=org.id,
        name="Engineering",
        description="Default Engineering Team"
    )
    db.add(team)
    db.flush()

    project = Project(
        organization_id=org.id,
        team_id=team.id,
        name="Default Project",
        description="Default API Proxy Project"
    )
    db.add(project)
    db.commit()

    token = create_jwt_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status
        },
        "organization": {
            "id": org.id,
            "name": org.name,
            "role": "owner"
        }
    }

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_pass(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password"
        )
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact system administrator."
        )

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Fetch user's primary organization membership
    member = db.query(OrganizationMember).filter(OrganizationMember.user_id == user.id).first()
    org_data = None
    if member:
        org_data = {
            "id": member.organization_id,
            "name": member.organization.name,
            "role": member.role
        }

    token = create_jwt_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status
        },
        "organization": org_data
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Informs client to discard session tokens."""
    return {"message": "Successfully logged out of session"}

@router.post("/refresh")
def refresh_token(current_user: User = Depends(get_current_user)):
    """Issues fresh access token for authenticated session."""
    new_token = create_jwt_token(current_user.id)
    return {"access_token": new_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns current active user profile with organization memberships."""
    memberships = db.query(OrganizationMember).filter(OrganizationMember.user_id == current_user.id).all()
    orgs_list = [
        {
            "id": m.organization.id,
            "name": m.organization.name,
            "slug": m.organization.slug,
            "role": m.role,
            "created_at": m.organization.created_at.isoformat() if m.organization.created_at else ""
        }
        for m in memberships
    ]

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else "",
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "organizations": orgs_list
    }
