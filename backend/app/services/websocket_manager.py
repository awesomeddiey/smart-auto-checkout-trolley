import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages active WebSocket connections keyed by session token."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, token: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(token, []).append(websocket)
        logger.info("WS connected: session=%s  total=%d", token, len(self._connections[token]))

    def disconnect(self, token: str, websocket: WebSocket) -> None:
        if token in self._connections:
            self._connections[token] = [
                ws for ws in self._connections[token] if ws is not websocket
            ]
            if not self._connections[token]:
                del self._connections[token]

    async def send(self, token: str, event_type: str, data: Any) -> None:
        payload = json.dumps({"type": event_type, "data": data})
        dead: list[WebSocket] = []
        for ws in self._connections.get(token, []):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(token, ws)

    async def broadcast(self, event_type: str, data: Any) -> None:
        payload = json.dumps({"type": event_type, "data": data})
        for token, connections in list(self._connections.items()):
            dead: list[WebSocket] = []
            for ws in connections:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(token, ws)

    def active_sessions(self) -> list[str]:
        return list(self._connections.keys())


ws_manager = WebSocketManager()
