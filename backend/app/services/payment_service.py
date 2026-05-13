"""
EcoCash payment service.
Mock mode: simulates payment flow with configurable delay.
Production: calls EcoCash REST API.
"""
import asyncio
import random
import string
import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.session import TrolleySession, TrolleyItem
from app.models.transaction import Transaction
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)
settings = get_settings()


def _generate_receipt_number() -> str:
    return "RCT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


async def initiate_payment(
    db: AsyncSession,
    session: TrolleySession,
    customer_phone: str,
    amount: Decimal,
) -> Transaction:
    transaction = Transaction(
        session_id=session.id,
        transaction_ref=str(uuid.uuid4()),
        customer_phone=customer_phone,
        amount=amount,
        payment_method="ecocash",
        status="pending",
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    session.customer_phone = customer_phone
    session.status = "checkout"
    await db.commit()

    if settings.ECOCASH_MOCK_MODE:
        asyncio.create_task(_mock_payment_flow(db, transaction, session))
    else:
        asyncio.create_task(_real_payment_initiate(db, transaction, session))

    return transaction


async def _mock_payment_flow(
    db: AsyncSession,
    transaction: Transaction,
    session: TrolleySession,
) -> None:
    """Simulate EcoCash processing: pending → processing → completed."""
    token = str(session.session_token)
    await asyncio.sleep(2)

    transaction.status = "processing"
    transaction.ecocash_ref = f"ECO-{uuid.uuid4().hex[:8].upper()}"
    await db.commit()
    await ws_manager.send(token, "payment_update", {"status": "processing", "ref": transaction.transaction_ref})

    await asyncio.sleep(4)

    # 95% success rate in mock
    success = random.random() > 0.05
    if success:
        receipt_data = await _build_receipt(db, transaction, session)
        transaction.status = "completed"
        transaction.completed_at = datetime.now(timezone.utc)
        transaction.receipt_data = receipt_data
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await ws_manager.send(token, "payment_completed", {
            "status": "completed",
            "ref": transaction.transaction_ref,
            "receipt": receipt_data,
        })
    else:
        transaction.status = "failed"
        session.status = "active"
        await db.commit()
        await ws_manager.send(token, "payment_failed", {"status": "failed", "ref": transaction.transaction_ref})


async def _real_payment_initiate(
    db: AsyncSession,
    transaction: Transaction,
    session: TrolleySession,
) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.ECOCASH_API_URL}/transactions/initiate",
                headers={"Authorization": f"Bearer {settings.ECOCASH_API_KEY}"},
                json={
                    "merchantCode": settings.ECOCASH_MERCHANT_CODE,
                    "customerPhone": transaction.customer_phone,
                    "amount": float(transaction.amount),
                    "reference": transaction.transaction_ref,
                    "description": f"Smart Trolley checkout {session.trolley_id}",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            transaction.ecocash_ref = data.get("transactionId")
            transaction.status = "processing"
            await db.commit()
    except Exception as exc:
        logger.error("EcoCash initiate failed: %s", exc)
        transaction.status = "failed"
        session.status = "active"
        await db.commit()


async def get_transaction(db: AsyncSession, ref: str) -> Optional[Transaction]:
    result = await db.execute(
        select(Transaction).where(Transaction.transaction_ref == ref)
    )
    return result.scalar_one_or_none()


async def _build_receipt(
    db: AsyncSession,
    transaction: Transaction,
    session: TrolleySession,
) -> dict:
    items = [
        {
            "name":       item.product.name if item.product else "Unknown",
            "quantity":   item.quantity,
            "unit_price": float(item.unit_price),
            "line_total": float(item.unit_price * item.quantity),
        }
        for item in session.items
        if item.status != "removed"
    ]
    return {
        "receipt_number":  _generate_receipt_number(),
        "transaction_ref": transaction.transaction_ref,
        "ecocash_ref":     transaction.ecocash_ref,
        "customer_phone":  transaction.customer_phone,
        "amount":          float(transaction.amount),
        "items":           items,
        "paid_at":         datetime.now(timezone.utc).isoformat(),
        "trolley_id":      session.trolley_id,
    }
