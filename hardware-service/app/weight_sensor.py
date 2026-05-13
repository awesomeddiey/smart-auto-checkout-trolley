"""
Weight sensor interface.
Uses MockLoadCell in dev; replace with HX711 driver for production.
"""
import asyncio
import logging
import os

import httpx

from app.mock_adapters import MockLoadCell

logger = logging.getLogger(__name__)

MOCK_MODE       = os.getenv("HARDWARE_MOCK", "true").lower() == "true"
BACKEND_URL     = os.getenv("BACKEND_URL", "http://localhost:8000")
POLL_INTERVAL   = float(os.getenv("WEIGHT_POLL_MS", "200")) / 1000
CHANGE_THRESHOLD = float(os.getenv("WEIGHT_THRESHOLD_GRAMS", "30"))

_load_cell: MockLoadCell | None = None


def get_load_cell() -> MockLoadCell:
    global _load_cell
    if _load_cell is None:
        if MOCK_MODE:
            _load_cell = MockLoadCell()
        else:
            try:
                import RPi.GPIO as GPIO
                from hx711 import HX711
                hx = HX711(dout_pin=5, pd_sck_pin=6)
                hx.reset()
                hx.tare()
                _load_cell = hx
            except ImportError:
                logger.warning("HX711 driver not available — using mock")
                _load_cell = MockLoadCell()
    return _load_cell


async def poll_weight(session_token: str) -> None:
    """Background task: poll load cell and notify backend on significant change."""
    cell = get_load_cell()
    logger.info("Weight polling started for session %s", session_token)
    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(POLL_INTERVAL)
            delta = cell.detect_change(threshold_grams=CHANGE_THRESHOLD)
            if delta is not None:
                logger.info("Weight event: delta=%.1f g", delta)
                try:
                    await client.post(
                        f"{BACKEND_URL}/api/v1/sessions/{session_token}/weight",
                        json={"delta_grams": delta, "session_token": session_token},
                        timeout=3.0,
                    )
                except Exception as exc:
                    logger.warning("Failed to post weight event: %s", exc)


def current_weight() -> float:
    return get_load_cell().read_grams()
