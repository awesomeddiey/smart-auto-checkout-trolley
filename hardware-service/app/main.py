import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.weight_sensor import get_load_cell, current_weight
from app.mock_adapters import MockLoadCell

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Smart Trolley Hardware Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class SimulatePayload(BaseModel):
    weight_grams: float
    action:       str = "add"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hardware-service"}


@app.get("/weight/latest")
async def weight_latest():
    grams = current_weight()
    return {"delta_grams": grams, "unit": "grams"}


@app.post("/weight/tare")
async def tare():
    cell = get_load_cell()
    cell.tare()
    return {"message": "Load cell tared"}


@app.post("/simulate/weight")
async def simulate_weight(payload: SimulatePayload):
    """Dev endpoint: simulate an item being added/removed."""
    cell = get_load_cell()
    if not isinstance(cell, MockLoadCell):
        return {"error": "Simulation only available in mock mode"}
    if payload.action == "add":
        cell.simulate_add(payload.weight_grams)
    else:
        cell.simulate_remove(payload.weight_grams)
    return {"action": payload.action, "weight_grams": payload.weight_grams, "current": current_weight()}
