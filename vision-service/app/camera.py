"""
Camera interface for trolley-mounted camera.
Supports both real OpenCV capture and a mock mode that returns a blank frame.
"""
import logging
import os
import numpy as np

logger = logging.getLogger(__name__)

MOCK_MODE = os.getenv("CAMERA_MOCK", "true").lower() == "true"


class Camera:
    def __init__(self, device_index: int = 0):
        self._cap = None
        self._device = device_index
        if not MOCK_MODE:
            self._open()

    def _open(self):
        try:
            import cv2
            self._cap = cv2.VideoCapture(self._device)
            if not self._cap.isOpened():
                logger.warning("Camera device %d not available — falling back to mock", self._device)
                self._cap = None
        except Exception as exc:
            logger.warning("OpenCV not available: %s — using mock frames", exc)

    def capture_frame(self) -> np.ndarray:
        """Return a BGR numpy frame."""
        if self._cap and self._cap.isOpened():
            ret, frame = self._cap.read()
            if ret:
                return frame

        # Mock: return a grey 640x480 frame with a white rectangle (product placeholder)
        frame = np.ones((480, 640, 3), dtype=np.uint8) * 40
        frame[160:320, 220:420] = 200
        return frame

    def release(self):
        if self._cap:
            self._cap.release()

    def __del__(self):
        self.release()


# Module-level singleton
_camera: Camera | None = None


def get_camera() -> Camera:
    global _camera
    if _camera is None:
        _camera = Camera()
    return _camera
