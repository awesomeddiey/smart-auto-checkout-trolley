"""Verification orchestrator: capture → detect → compare → respond."""
import logging
from app.camera import get_camera
from app.detector import get_detector

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.70


async def verify_product(
    expected_class: str,
    sku: str,
    item_id: int,
    session_token: str,
) -> dict:
    """
    Capture a frame from the trolley camera, run object detection,
    compare against the expected product class, return verification result.
    """
    camera   = get_camera()
    detector = get_detector()

    frame      = camera.capture_frame()
    detections = detector.detect(frame)

    if not detections:
        return {
            "match":          False,
            "confidence":     0.0,
            "detected_class": None,
            "expected_class": expected_class,
            "sku":            sku,
            "item_id":        item_id,
            "reason":         "no_detection",
        }

    best = detector.best_match(detections, expected_class)
    top  = detections[0]

    if best and best.confidence >= CONFIDENCE_THRESHOLD:
        return {
            "match":          True,
            "confidence":     best.confidence,
            "detected_class": best.class_name,
            "expected_class": expected_class,
            "sku":            sku,
            "item_id":        item_id,
            "reason":         "matched",
        }
    else:
        return {
            "match":          False,
            "confidence":     top.confidence,
            "detected_class": top.class_name,
            "expected_class": expected_class,
            "sku":            sku,
            "item_id":        item_id,
            "reason":         "class_mismatch" if top.class_name != expected_class else "low_confidence",
        }
