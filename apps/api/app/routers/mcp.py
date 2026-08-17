from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import MCPServer, MCPTool, ToolExecutionLog
from app.services.mcp_service import mcp_service

router = APIRouter(prefix="/api/v1/mcp", tags=["MCP Gateway"])

class RegisterMCPServerRequest(BaseModel):
    name: str
    endpoint: str
    organization_id: str
    project_id: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None

class ExecuteToolRequest(BaseModel):
    tool_id: str
    organization_id: str
    project_id: Optional[str] = None
    input_payload: Optional[Dict[str, Any]] = None

@router.post("/servers", status_code=201)
def register_mcp_server(
    req: RegisterMCPServerRequest,
    db: Session = Depends(get_db)
):
    try:
        return mcp_service.register_server(
            db=db,
            name=req.name,
            endpoint=req.endpoint,
            organization_id=req.organization_id,
            project_id=req.project_id,
            auth_config=req.auth_config
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/servers")
def list_mcp_servers(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(MCPServer)
    if organization_id:
        q = q.filter(MCPServer.organization_id == organization_id)
    servers = q.all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "endpoint": s.endpoint,
            "status": s.status,
            "organization_id": s.organization_id,
            "project_id": s.project_id,
            "created_at": s.created_at.isoformat()
        }
        for s in servers
    ]

@router.get("/tools")
def list_mcp_tools(
    server_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(MCPTool)
    if server_id:
        q = q.filter(MCPTool.server_id == server_id)
    tools = q.all()
    return [
        {
            "id": t.id,
            "server_id": t.server_id,
            "tool_name": t.tool_name,
            "description": t.description,
            "parameters_schema": t.parameters_schema,
            "is_approved": t.is_approved
        }
        for t in tools
    ]

@router.post("/tools/execute")
async def execute_tool(
    req: ExecuteToolRequest,
    db: Session = Depends(get_db)
):
    try:
        return await mcp_service.execute_tool(
            db=db,
            tool_id=req.tool_id,
            input_payload=req.input_payload or {},
            organization_id=req.organization_id,
            project_id=req.project_id
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-logs")
def list_tool_audit_logs(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(ToolExecutionLog)
    if organization_id:
        q = q.filter(ToolExecutionLog.organization_id == organization_id)
    logs = q.order_by(ToolExecutionLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "tool_name": l.tool_name,
            "organization_id": l.organization_id,
            "project_id": l.project_id,
            "status_code": l.status_code,
            "latency_ms": l.latency_ms,
            "input_payload": l.input_payload,
            "output_payload": l.output_payload,
            "timestamp": l.created_at.isoformat()
        }
        for l in logs
    ]
