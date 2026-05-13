import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager
from app.services.cart_service import get_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws/session/{token}")
async def session_websocket(token: str, websocket: WebSocket):
    await ws_manager.connect(token, websocket)
    try:
        await ws_manager.send(token, "connected", {"session_token": token, "message": "Connected to trolley session"})
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
                event_type = message.get("type")
                data = message.get("data", {})
                logger.debug("WS recv [%s]: %s", event_type, data)
                # Client can send weight events, manual scan triggers, etc.
                await ws_manager.send(token, "ack", {"type": event_type})
            except json.JSONDecodeError:
                await ws_manager.send(token, "error", {"message": "Invalid JSON"})
    except WebSocketDisconnect:
        ws_manager.disconnect(token, websocket)
        logger.info("WS disconnected: session=%s", token)
