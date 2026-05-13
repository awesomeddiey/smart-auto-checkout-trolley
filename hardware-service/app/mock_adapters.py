"""
Mock hardware adapters for development.
Replace each class with a real implementation when hardware is available.
"""
import asyncio
import logging
import random
import time

logger = logging.getLogger(__name__)


class MockLoadCell:
    """Simulates an HX711 load cell sensor."""

    def __init__(self):
        self._baseline_grams = 0.0
        self._readings: list[float] = []
        self._last_event_time = 0.0

    def tare(self) -> None:
        self._baseline_grams = self._current_raw()
        logger.info("Load cell tared — baseline: %.1f g", self._baseline_grams)

    def _current_raw(self) -> float:
        noise = random.gauss(0, 2.0)
        return self._baseline_grams + noise

    def read_grams(self) -> float:
        raw = self._current_raw()
        self._readings.append(raw)
        if len(self._readings) > 10:
            self._readings.pop(0)
        return round(sum(self._readings) / len(self._readings), 1)

    def detect_change(self, threshold_grams: float = 30.0) -> float | None:
        """Returns weight delta if a significant change is detected, else None."""
        current = self.read_grams()
        delta = current - self._baseline_grams
        if abs(delta) >= threshold_grams:
            if time.time() - self._last_event_time > 1.0:
                self._last_event_time = time.time()
                self._baseline_grams = current
                return round(delta, 1)
        return None

    def simulate_add(self, weight_grams: float) -> None:
        self._baseline_grams += weight_grams
        logger.info("Mock: item added %.1f g (total: %.1f g)", weight_grams, self._baseline_grams)

    def simulate_remove(self, weight_grams: float) -> None:
        self._baseline_grams = max(0, self._baseline_grams - weight_grams)
        logger.info("Mock: item removed %.1f g (total: %.1f g)", weight_grams, self._baseline_grams)


class MockBarcodeReader:
    """Simulates a USB/serial barcode scanner."""

    SAMPLE_BARCODES = [
        "6001007012345",
        "6001007022345",
        "6001007042346",
        "6001007082345",
        "6001007062345",
    ]

    async def read(self) -> str:
        await asyncio.sleep(random.uniform(1.5, 4.0))
        return random.choice(self.SAMPLE_BARCODES)
