import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Organization, OrganizationMember, Team, TeamMember, Project
from app.security_rbac import get_current_user, verify_org_access, verify_project_access

router = APIRouter(prefix="/api/v1", tags=["Organizations, Teams & Projects"])

# Schemas
class CreateOrgRequest(BaseModel):
    name: str

class AddMemberRequest(BaseModel):
    email: EmailStr
    role: str  # admin, developer, viewer

class UpdateMemberRoleRequest(BaseModel):
    role: str  # owner, admin, developer, viewer

class CreateTeamRequest(BaseModel):
    name: str
    description: Optional[str] = None

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: Optional[str] = None

# --- ORGANIZATIONS ---

@router.get("/organizations")
def list_user_organizations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists all organizations the current user belongs to."""
    memberships = db.query(OrganizationMember).filter(OrganizationMember.user_id == current_user.id).all()
    return [
        {
            "id": m.organization.id,
            "name": m.organization.name,
            "slug": m.organization.slug,
            "owner_id": m.organization.owner_id,
            "user_role": m.role,
            "created_at": m.organization.created_at.isoformat() if m.organization.created_at else ""
        }
        for m in memberships
    ]

@router.post("/organizations")
def create_organization(payload: CreateOrgRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new organization. Caller automatically becomes Owner."""
    org_slug = f"org-{secrets.token_hex(4)}"
    org = Organization(
        name=payload.name,
        slug=org_slug,
        owner_id=current_user.id
    )
    db.add(org)
    db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(member)
    
    # Create Default Team
    team = Team(
        organization_id=org.id,
        name="General Engineering",
        description="Default Organization Team"
    )
    db.add(team)
    db.commit()

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "owner_id": org.owner_id,
        "user_role": "owner"
    }

@router.get("/organizations/{org_id}")
def get_organization(org_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Gets organization details with tenant isolation verification."""
    member = verify_org_access(org_id, current_user, db)
    org = member.organization
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "owner_id": org.owner_id,
        "user_role": member.role,
        "member_count": db.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id).count(),
        "project_count": db.query(Project).filter(Project.organization_id == org_id).count()
    }

# --- MEMBERS & RBAC MANAGEMENT ---

@router.get("/organizations/{org_id}/members")
def list_organization_members(org_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists organization members with their roles."""
    verify_org_access(org_id, current_user, db)
    members = db.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id).all()
    return [
        {
            "id": m.id,
            "user_id": m.user.id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role,
            "joined_at": m.created_at.isoformat() if m.created_at else ""
        }
        for m in members
    ]

@router.post("/organizations/{org_id}/members")
def add_organization_member(org_id: str, payload: AddMemberRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Adds or invites a user to the organization. Requires Owner or Admin role."""
    verify_org_access(org_id, current_user, db, required_roles=["owner", "admin"])

    target_role = payload.role.lower()
    if target_role not in ["admin", "developer", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin', 'developer', or 'viewer'.")

    target_user = db.query(User).filter(User.email == payload.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No registered user found with email '{payload.email}'")

    existing = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == target_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization")

    new_member = OrganizationMember(
        organization_id=org_id,
        user_id=target_user.id,
        role=target_role
    )
    db.add(new_member)
    db.commit()

    return {
        "message": f"Successfully added {target_user.email} as {target_role}",
        "member_id": new_member.id
    }

@router.patch("/organizations/{org_id}/members/{user_id}")
def update_member_role(org_id: str, user_id: str, payload: UpdateMemberRoleRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Updates member RBAC role. Requires Owner or Admin role."""
    verify_org_access(org_id, current_user, db, required_roles=["owner", "admin"])

    target_role = payload.role.lower()
    if target_role not in ["owner", "admin", "developer", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role.")

    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found in organization")

    member.role = target_role
    db.commit()

    return {"message": f"Updated role to {target_role}"}

@router.delete("/organizations/{org_id}/members/{user_id}")
def remove_organization_member(org_id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Removes a user from the organization. Requires Owner or Admin role."""
    verify_org_access(org_id, current_user, db, required_roles=["owner", "admin"])

    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "owner" and current_user.id != member.organization.owner_id:
        raise HTTPException(status_code=403, detail="Cannot remove organization owner")

    db.delete(member)
    db.commit()
    return {"message": "Member removed from organization"}

# --- TEAMS ---

@router.get("/organizations/{org_id}/teams")
def list_teams(org_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists all teams in the organization."""
    verify_org_access(org_id, current_user, db)
    teams = db.query(Team).filter(Team.organization_id == org_id).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else ""
        }
        for t in teams
    ]

@router.post("/organizations/{org_id}/teams")
def create_team(org_id: str, payload: CreateTeamRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new team. Requires Owner or Admin role."""
    verify_org_access(org_id, current_user, db, required_roles=["owner", "admin"])

    team = Team(
        organization_id=org_id,
        name=payload.name,
        description=payload.description
    )
    db.add(team)
    db.commit()

    return {"id": team.id, "name": team.name, "description": team.description}

# --- PROJECTS ---

@router.get("/organizations/{org_id}/projects")
def list_organization_projects(org_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists all projects within the authorized organization."""
    verify_org_access(org_id, current_user, db)
    projects = db.query(Project).filter(Project.organization_id == org_id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "team_id": p.team_id,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else ""
        }
        for p in projects
    ]

@router.post("/organizations/{org_id}/projects")
def create_project(org_id: str, payload: CreateProjectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new project in the organization. Requires Owner, Admin, or Developer role."""
    verify_org_access(org_id, current_user, db, required_roles=["owner", "admin", "developer"])

    project = Project(
        organization_id=org_id,
        team_id=payload.team_id,
        name=payload.name,
        description=payload.description
    )
    db.add(project)
    db.commit()

    return {
        "id": project.id,
        "organization_id": project.organization_id,
        "name": project.name,
        "description": project.description
    }

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Deletes a project. Requires Owner or Admin role."""
    project = verify_project_access(project_id, current_user, db, required_roles=["owner", "admin"])
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
