import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.verifier import verify_product

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Smart Trolley Vision Service", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class VerifyRequest(BaseModel):
    sku:            str
    expected_class: str
    item_id:        int
    session_token:  str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vision-service"}


@app.post("/verify")
async def verify(payload: VerifyRequest):
    result = await verify_product(
        expected_class=payload.expected_class,
        sku=payload.sku,
        item_id=payload.item_id,
        session_token=payload.session_token,
    )
    return result


@app.get("/camera/frame")
async def capture_frame_info():
    """Returns metadata about the last captured frame (for debugging)."""
    from app.camera import get_camera
    import numpy as np
    camera = get_camera()
    frame  = camera.capture_frame()
    h, w   = frame.shape[:2]
    return {"width": w, "height": h, "channels": frame.shape[2] if frame.ndim == 3 else 1}
