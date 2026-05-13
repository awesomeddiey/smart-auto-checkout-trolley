from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class PaymentInitiateRequest(BaseModel):
    session_token:  str
    customer_phone: str
    amount:         Decimal


class PaymentStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:              int
    transaction_ref: str
    customer_phone:  Optional[str]
    amount:          Decimal
    payment_method:  str
    status:          str
    ecocash_ref:     Optional[str]
    initiated_at:    datetime
    completed_at:    Optional[datetime] = None
    receipt_data:    Optional[dict[str, Any]] = None


class PaymentInitiateOut(BaseModel):
    transaction_ref: str
    status:          str
    message:         str
    poll_url:        str


class EcocashCallbackPayload(BaseModel):
    transaction_ref:  str
    ecocash_ref:      str
    status:           str
    amount:           Decimal
    customer_phone:   str


class ReceiptOut(BaseModel):
    transaction_ref: str
    session_id:      int
    customer_phone:  Optional[str]
    amount:          Decimal
    items:           list[dict[str, Any]]
    paid_at:         datetime
    receipt_number:  str
