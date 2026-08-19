from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import ApiKey
from app.services.api_key_service import api_key_service

router = APIRouter(prefix="/v1/keys", tags=["Virtual API Keys"])

class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., example="Production Gateway Key A")
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None

@router.post("", status_code=201)
def create_api_key(
    req: CreateApiKeyRequest,
    db: Session = Depends(get_db)
):
    """
    Generates a new WhiteGator Virtual API key.
    The secret key is returned ONLY ONCE in the response body.
    """
    try:
        return api_key_service.create_key(
            db=db,
            name=req.name,
            organization_id=req.organization_id,
            project_id=req.project_id,
            permissions=req.permissions,
            limits=req.limits
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_api_keys(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lists virtual API keys (returns prefix, metadata, status, limits; secret is NEVER returned).
    """
    query = db.query(ApiKey)
    if organization_id:
        query = query.filter(ApiKey.organization_id == organization_id)
    if project_id:
        query = query.filter(ApiKey.project_id == project_id)
        
    keys = query.order_by(ApiKey.created_at.desc()).all()
    
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "organization_id": k.organization_id,
            "project_id": k.project_id,
            "status": k.status,
            "is_active": k.is_active,
            "spend_usd": round(k.spend_usd, 6),
            "permissions": k.permissions,
            "limits": k.limits,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else ""
        }
        for k in keys
    ]

@router.get("/{key_id}")
def inspect_api_key(
    key_id: str,
    db: Session = Depends(get_db)
):
    """
    Inspects details of a virtual API key (secret is NEVER returned).
    """
    try:
        return api_key_service.inspect_key(db, key_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{key_id}/revoke")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db)
):
    """
    Revokes a virtual API key immediately.
    """
    try:
        return api_key_service.revoke_key(db, key_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{key_id}/rotate")
def rotate_api_key(
    key_id: str,
    db: Session = Depends(get_db)
):
    """
    Rotates a virtual API key. Revokes existing key and returns new raw secret key once.
    """
    try:
        return api_key_service.rotate_key(db, key_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/{key_id}/usage")
def get_api_key_usage(
    key_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns real-time usage metrics for a specific virtual API key.
    """
    try:
        return api_key_service.get_key_usage(db, key_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
