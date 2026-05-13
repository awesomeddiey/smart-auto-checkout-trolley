from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductLookupOut


class TrolleyItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:                 int
    session_id:         int
    product:            ProductLookupOut
    quantity:           int
    unit_price:         Decimal
    vision_verified:    bool
    weight_verified:    bool
    status:             str
    added_at:           datetime
    verified_at:        Optional[datetime] = None
    removed_at:         Optional[datetime] = None
    vision_confidence:  Optional[Decimal] = None
    detected_class:     Optional[str] = None
    weight_delta_grams: Optional[Decimal] = None


class SessionCreate(BaseModel):
    trolley_id: Optional[str] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             int
    session_token:  UUID
    trolley_id:     Optional[str]
    customer_phone: Optional[str]
    status:         str
    total_amount:   Decimal
    item_count:     int
    started_at:     datetime
    completed_at:   Optional[datetime] = None
    items:          list[TrolleyItemOut] = []


class ScanRequest(BaseModel):
    barcode: str


class VerificationResult(BaseModel):
    item_id:           int
    vision_verified:   bool
    weight_verified:   bool
    vision_confidence: Optional[float] = None
    detected_class:    Optional[str] = None
    weight_delta:      Optional[float] = None
    status:            str
    message:           str


class WeightEventRequest(BaseModel):
    session_token: str
    delta_grams:   float
    total_grams:   Optional[float] = None


class CheckoutRequest(BaseModel):
    customer_phone: str


class MismatchLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             int
    session_id:     Optional[int]
    scanned_sku:    Optional[str]
    detected_class: Optional[str]
    confidence:     Optional[Decimal]
    weight_delta:   Optional[Decimal]
    mismatch_type:  Optional[str]
    resolved:       bool
    created_at:     datetime
