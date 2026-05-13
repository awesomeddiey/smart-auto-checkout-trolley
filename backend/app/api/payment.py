from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.payment import PaymentStatusOut, EcocashCallbackPayload, ReceiptOut
from app.services.payment_service import get_transaction

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/{ref}", response_model=PaymentStatusOut)
async def get_payment_status(ref: str, db: AsyncSession = Depends(get_db)):
    tx = await get_transaction(db, ref)
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return tx


@router.get("/{ref}/receipt", response_model=ReceiptOut)
async def get_receipt(ref: str, db: AsyncSession = Depends(get_db)):
    tx = await get_transaction(db, ref)
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.status != "completed":
        raise HTTPException(400, "Payment not yet completed")
    if not tx.receipt_data:
        raise HTTPException(404, "Receipt not available")
    rd = tx.receipt_data
    from datetime import datetime
    return ReceiptOut(
        transaction_ref=tx.transaction_ref,
        session_id=tx.session_id,
        customer_phone=tx.customer_phone,
        amount=tx.amount,
        items=rd.get("items", []),
        paid_at=tx.completed_at or datetime.utcnow(),
        receipt_number=rd.get("receipt_number", ""),
    )


@router.post("/callback/ecocash")
async def ecocash_callback(
    payload: EcocashCallbackPayload,
    db:      AsyncSession = Depends(get_db),
):
    """Webhook called by EcoCash when payment is confirmed/rejected."""
    tx = await get_transaction(db, payload.transaction_ref)
    if not tx:
        return {"status": "ignored"}

    if payload.status == "SUCCESS":
        from datetime import datetime, timezone
        from app.services.payment_service import _build_receipt
        from app.services.cart_service import get_session_by_id
        tx.status = "completed"
        tx.ecocash_ref = payload.ecocash_ref
        from sqlalchemy.ext.asyncio import AsyncSession as AS
        session = await get_session_by_id(db, tx.session_id)
        if session:
            receipt_data = await _build_receipt(db, tx, session)
            tx.receipt_data = receipt_data
            tx.completed_at = datetime.now(timezone.utc)
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)
            from app.services.websocket_manager import ws_manager
            await ws_manager.send(str(session.session_token), "payment_completed", {
                "ref": tx.transaction_ref,
                "receipt": receipt_data,
            })
    elif payload.status in ("FAILED", "CANCELLED"):
        tx.status = "failed"
        session = await db.get(type(tx.session_id).__class__, tx.session_id)
    await db.commit()
    return {"status": "ok"}
