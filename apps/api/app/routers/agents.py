from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.agent_service import agent_service

router = APIRouter(prefix="/v1/agents", tags=["Agent Gateway"])

class RegisterAgentRequest(BaseModel):
    name: str
    description: str
    endpoint: str
    organization_id: str
    protocol: Optional[str] = "http"
    project_id: Optional[str] = None

class DispatchAgentRequest(BaseModel):
    agent_id: str
    organization_id: str
    payload: Dict[str, Any]

@router.post("", status_code=201)
def register_agent(
    req: RegisterAgentRequest,
    db: Session = Depends(get_db)
):
    try:
        return agent_service.register_agent(
            db=db,
            name=req.name,
            description=req.description,
            endpoint=req.endpoint,
            organization_id=req.organization_id,
            protocol=req.protocol or "http",
            project_id=req.project_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_agents(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return agent_service.list_agents(
        db=db,
        organization_id=organization_id,
        project_id=project_id
    )

@router.post("/dispatch")
def dispatch_agent(
    req: DispatchAgentRequest,
    db: Session = Depends(get_db)
):
    try:
        return agent_service.dispatch_agent_request(
            db=db,
            agent_id=req.agent_id,
            payload=req.payload,
            organization_id=req.organization_id
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
