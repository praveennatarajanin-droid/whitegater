import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import AgentRegistry, Organization, Project

class AgentService:
    def register_agent(
        self,
        db: Session,
        name: str,
        description: str,
        endpoint: str,
        organization_id: str,
        protocol: str = "http",
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        agent = AgentRegistry(
            name=name,
            description=description,
            endpoint=endpoint,
            protocol=protocol,
            organization_id=organization_id,
            project_id=project_id,
            status="active"
        )
        db.add(agent)
        db.commit()
        return {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "endpoint": agent.endpoint,
            "protocol": agent.protocol,
            "status": agent.status,
            "organization_id": agent.organization_id,
            "project_id": agent.project_id,
            "created_at": agent.created_at.isoformat()
        }

    def list_agents(
        self,
        db: Session,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        q = db.query(AgentRegistry)
        if organization_id:
            q = q.filter(AgentRegistry.organization_id == organization_id)
        if project_id:
            q = q.filter(AgentRegistry.project_id == project_id)

        agents = q.all()
        return [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "endpoint": a.endpoint,
                "protocol": a.protocol,
                "status": a.status,
                "organization_id": a.organization_id,
                "project_id": a.project_id,
                "created_at": a.created_at.isoformat()
            }
            for a in agents
        ]

    def dispatch_agent_request(
        self,
        db: Session,
        agent_id: str,
        payload: Dict[str, Any],
        organization_id: str
    ) -> Dict[str, Any]:
        agent = db.query(AgentRegistry).filter(AgentRegistry.id == agent_id).first()
        if not agent or agent.status != "active":
            raise ValueError("Agent is not active or found")

        if agent.organization_id != organization_id:
            raise PermissionError("Organization mismatch for agent request")

        return {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "status": "success",
            "agent_response": {
                "message": f"Agent '{agent.name}' processed request successfully",
                "received_payload": payload
            }
        }

agent_service = AgentService()
