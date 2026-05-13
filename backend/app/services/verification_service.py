"""
Verification service: coordinates vision + weight checks.
In production, calls the vision-service and hardware-service.
In mock mode, simulates responses.
"""
import asyncio
import random
import logging
from decimal import Decimal
from typing import Optional

import httpx

from app.core.config import get_settings
from app.models.session import TrolleyItem
from app.models.product import Product
from app.models.transaction import MismatchLog
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)
settings = get_settings()

VISION_CONFIDENCE_THRESHOLD = 0.70


async def request_vision_verification(
    product: Product,
    item: TrolleyItem,
    session_token: str,
) -> dict:
    """Call vision-service or return mock result."""
    if settings.ENVIRONMENT == "development":
        await asyncio.sleep(0.8)
        match = random.random() > 0.08
        confidence = random.uniform(0.82, 0.99) if match else random.uniform(0.30, 0.65)
        detected = product.yolo_class_name if match else "unknown_object"
        return {
            "match": match,
            "confidence": round(confidence, 4),
            "detected_class": detected,
            "expected_class": product.yolo_class_name,
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.VISION_SERVICE_URL}/verify",
                json={
                    "sku": product.sku,
                    "expected_class": product.yolo_class_name,
                    "item_id": item.id,
                    "session_token": session_token,
                },
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Vision service unavailable: %s", exc)
        return {"match": False, "confidence": 0.0, "detected_class": "service_error"}


async def request_weight_verification(
    product: Product,
    item: TrolleyItem,
) -> dict:
    """Call hardware-service or return mock result."""
    if settings.ENVIRONMENT == "development":
        await asyncio.sleep(0.4)
        expected = float(product.weight_grams or 0)
        tolerance = float(product.weight_tolerance_percent or 10) / 100
        low = expected * (1 - tolerance)
        high = expected * (1 + tolerance)
        measured = random.uniform(low * 0.95, high * 1.05)
        valid = low <= measured <= high
        return {
            "valid": valid,
            "measured_delta": round(measured, 1),
            "expected_weight": expected,
            "tolerance_percent": float(product.weight_tolerance_percent or 10),
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.HARDWARE_SERVICE_URL}/weight/latest")
            resp.raise_for_status()
            data = resp.json()
            expected = float(product.weight_grams or 0)
            tolerance = float(product.weight_tolerance_percent or 10) / 100
            measured = data.get("delta_grams", 0)
            valid = expected * (1 - tolerance) <= measured <= expected * (1 + tolerance)
            return {
                "valid": valid,
                "measured_delta": measured,
                "expected_weight": expected,
            }
    except Exception as exc:
        logger.warning("Hardware service unavailable: %s", exc)
        return {"valid": False, "measured_delta": 0, "expected_weight": 0}


async def run_verification(
    db: AsyncSession,
    item: TrolleyItem,
    product: Product,
    session_token: str,
) -> dict:
    """Run vision + weight checks concurrently and return combined result."""
    vision_task = asyncio.create_task(
        request_vision_verification(product, item, session_token)
    )
    weight_task = asyncio.create_task(
        request_weight_verification(product, item)
    )
    vision_result, weight_result = await asyncio.gather(vision_task, weight_task)

    vision_ok = vision_result["match"] and vision_result["confidence"] >= VISION_CONFIDENCE_THRESHOLD
    weight_ok = weight_result["valid"]

    # Determine item status
    if vision_ok and weight_ok:
        status = "verified"
    else:
        status = "flagged"
        mismatch_type = (
            "both"   if not vision_ok and not weight_ok else
            "vision" if not vision_ok else
            "weight"
        )
        log = MismatchLog(
            session_id=item.session_id,
            trolley_item_id=item.id,
            scanned_sku=product.sku,
            scanned_barcode=product.barcode,
            detected_class=vision_result.get("detected_class"),
            confidence=Decimal(str(vision_result.get("confidence", 0))),
            weight_delta=Decimal(str(weight_result.get("measured_delta", 0))),
            expected_weight=Decimal(str(weight_result.get("expected_weight", 0))),
            mismatch_type=mismatch_type,
            raw_payload={
                "vision": vision_result,
                "weight": weight_result,
            },
        )
        db.add(log)
        await db.commit()

    return {
        "status": status,
        "vision_verified": vision_ok,
        "weight_verified": weight_ok,
        "vision_confidence": vision_result.get("confidence"),
        "detected_class": vision_result.get("detected_class"),
        "weight_delta": weight_result.get("measured_delta"),
        "vision_result": vision_result,
        "weight_result": weight_result,
    }
