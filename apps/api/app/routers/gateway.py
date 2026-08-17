from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Header, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ModelCatalog
from app.services.gateway_service import gateway_service

router = APIRouter(prefix="/v1", tags=["AI Gateway"])

@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    payload: Dict[str, Any],
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    OpenAI-Compatible Chat Completions Gateway Endpoint.
    Supports streaming (stream: true) and non-streaming requests.
    """
    if payload.get("stream"):
        generator = gateway_service.process_chat_completion_stream(
            raw_api_key=authorization,
            payload=payload,
            db=db
        )
        return StreamingResponse(generator, media_type="text/event-stream")

    res = await gateway_service.process_chat_completion(
        raw_api_key=authorization,
        payload=payload,
        db=db
    )
    return res

@router.post("/responses")
async def responses_completion(
    request: Request,
    payload: Dict[str, Any],
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    OpenAI-Compatible Responses Endpoint.
    """
    res = await gateway_service.process_chat_completion(
        raw_api_key=authorization,
        payload=payload,
        db=db
    )
    return res

@router.post("/embeddings")
async def embeddings(
    request: Request,
    payload: Dict[str, Any],
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    OpenAI-Compatible Embeddings Endpoint.
    """
    res = await gateway_service.process_embeddings(
        raw_api_key=authorization,
        payload=payload,
        db=db
    )
    return res

@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    """
    Returns OpenAI-compatible model list dynamically fetched from ModelCatalog configuration.
    """
    models = db.query(ModelCatalog).filter(ModelCatalog.enabled == True).all()
    data = []
    for m in models:
        data.append({
            "id": m.model_alias or m.model_code,
            "object": "model",
            "created": 1700000000,
            "owned_by": "whitegator",
            "permission": [],
            "root": m.model_code,
            "parent": None,
            "capabilities": m.capabilities
        })
        if m.model_alias and m.model_alias != m.model_code:
            data.append({
                "id": m.model_code,
                "object": "model",
                "created": 1700000000,
                "owned_by": "whitegator",
                "permission": [],
                "root": m.model_code,
                "parent": None,
                "capabilities": m.capabilities
            })
            
    return {
        "object": "list",
        "data": data
    }
