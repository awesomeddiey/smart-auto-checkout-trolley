"""
YOLOv8-based object detector for trolley product verification.

In production:
  - Fine-tune YOLOv8n on a custom retail dataset
  - Store trained weights at MODEL_PATH
  - Each product's `yolo_class_name` maps to a model class

In development / mock mode:
  - Returns a simulated detection result
"""
import logging
import os
import random
from dataclasses import dataclass
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH  = os.getenv("YOLO_MODEL_PATH", "models/trolley_yolov8n.pt")
MOCK_MODE   = os.getenv("VISION_MOCK", "true").lower() == "true"
CONF_THRESH = float(os.getenv("CONF_THRESHOLD", "0.50"))


@dataclass
class Detection:
    class_name:  str
    confidence:  float
    bbox:        tuple[int, int, int, int]  # x1, y1, x2, y2


class TrolleyDetector:
    def __init__(self):
        self._model = None
        if not MOCK_MODE:
            self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self._model = YOLO(MODEL_PATH)
            logger.info("YOLOv8 model loaded from %s", MODEL_PATH)
        except Exception as exc:
            logger.warning("Could not load YOLO model: %s — running in mock mode", exc)

    def detect(self, frame: np.ndarray) -> list[Detection]:
        """Run inference on a frame and return top detections."""
        if self._model is None or MOCK_MODE:
            return self._mock_detect(frame)

        results = self._model(frame, conf=CONF_THRESH, verbose=False)
        detections: list[Detection] = []
        for r in results:
            for box in r.boxes:
                cls_id     = int(box.cls[0])
                class_name = r.names[cls_id]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                detections.append(Detection(class_name, confidence, (x1, y1, x2, y2)))
        return sorted(detections, key=lambda d: d.confidence, reverse=True)

    def _mock_detect(self, frame: np.ndarray) -> list[Detection]:
        """Return a plausible mock detection."""
        mock_classes = [
            "apple", "banana", "bread_loaf", "milk_carton", "chips_bag",
            "chocolate", "juice_box", "soda_bottle", "chicken", "pasta_box",
        ]
        cls   = random.choice(mock_classes)
        conf  = random.uniform(0.72, 0.97)
        h, w  = frame.shape[:2]
        return [Detection(cls, round(conf, 4), (w//4, h//4, 3*w//4, 3*h//4))]

    def best_match(self, detections: list[Detection], expected_class: str) -> Optional[Detection]:
        """Return the detection that best matches the expected class, or None."""
        for d in detections:
            if d.class_name == expected_class:
                return d
        return None


# Module-level singleton
_detector: TrolleyDetector | None = None


def get_detector() -> TrolleyDetector:
    global _detector
    if _detector is None:
        _detector = TrolleyDetector()
    return _detector
