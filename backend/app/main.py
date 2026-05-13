import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import api_router
from app.api.websocket import router as ws_router

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info("Smart Trolley API starting — env=%s", settings.ENVIRONMENT)
    yield
    logging.getLogger(__name__).info("Smart Trolley API shutting down")


app = FastAPI(
    title="Smart Auto-Checkout Trolley API",
    description="Backend for AI-powered retail trolley checkout system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "smart-trolley-api", "version": "1.0.0"}
