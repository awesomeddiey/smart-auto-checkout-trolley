from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.session import CheckoutRequest
from app.schemas.payment import PaymentInitiateOut, PaymentStatusOut
from app.services import cart_service, payment_service

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/{token}/initiate", response_model=PaymentInitiateOut)
async def initiate_checkout(
    token:   str,
    payload: CheckoutRequest,
    db:      AsyncSession = Depends(get_db),
):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status != "active":
        raise HTTPException(400, f"Session is not active (status: {session.status})")

    active_items = [i for i in session.items if i.status != "removed"]
    if not active_items:
        raise HTTPException(400, "Cart is empty")

    flagged = [i for i in active_items if i.status == "flagged"]
    if flagged:
        raise HTTPException(
            400,
            f"{len(flagged)} item(s) failed verification. Please remove flagged items before checkout.",
        )

    pending = [i for i in active_items if i.status == "pending"]
    if pending:
        raise HTTPException(
            400,
            f"{len(pending)} item(s) are still being verified. Please wait.",
        )

    transaction = await payment_service.initiate_payment(
        db,
        session,
        customer_phone=payload.customer_phone,
        amount=session.total_amount,
    )

    return PaymentInitiateOut(
        transaction_ref=transaction.transaction_ref,
        status="pending",
        message=f"EcoCash payment request sent to {payload.customer_phone}. Please approve on your phone.",
        poll_url=f"/api/v1/payments/{transaction.transaction_ref}",
    )


@router.get("/{token}/status", response_model=dict)
async def checkout_status(token: str, db: AsyncSession = Depends(get_db)):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")
    active = [i for i in session.items if i.status != "removed"]
    flagged = sum(1 for i in active if i.status == "flagged")
    pending = sum(1 for i in active if i.status == "pending")
    return {
        "session_status": session.status,
        "total_items":    len(active),
        "flagged_items":  flagged,
        "pending_items":  pending,
        "can_checkout":   flagged == 0 and pending == 0 and len(active) > 0,
        "total_amount":   float(session.total_amount),
    }
