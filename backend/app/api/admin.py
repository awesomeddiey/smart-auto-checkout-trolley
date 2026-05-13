from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.session import TrolleySession, TrolleyItem
from app.models.transaction import Transaction, MismatchLog
from app.models.product import Product
from app.schemas.session import MismatchLogOut
from app.schemas.payment import PaymentStatusOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_sessions_r = await db.execute(select(func.count()).select_from(TrolleySession))
    active_sessions_r = await db.execute(
        select(func.count()).select_from(TrolleySession).where(TrolleySession.status == "active")
    )
    completed_today_r = await db.execute(
        select(func.count()).select_from(TrolleySession).where(
            TrolleySession.status == "completed",
            func.date(TrolleySession.completed_at) == func.current_date(),
        )
    )
    revenue_today_r = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.status == "completed",
            func.date(Transaction.completed_at) == func.current_date(),
        )
    )
    mismatches_r = await db.execute(
        select(func.count()).select_from(MismatchLog).where(MismatchLog.resolved == False)
    )
    return {
        "total_sessions":      total_sessions_r.scalar(),
        "active_sessions":     active_sessions_r.scalar(),
        "completed_today":     completed_today_r.scalar(),
        "revenue_today":       float(revenue_today_r.scalar() or 0),
        "unresolved_mismatches": mismatches_r.scalar(),
    }


@router.get("/sessions")
async def list_sessions(
    status: str | None = Query(None),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(20, le=100),
    db:     AsyncSession = Depends(get_db),
):
    q = (
        select(TrolleySession)
        .options(selectinload(TrolleySession.items))
        .order_by(desc(TrolleySession.started_at))
        .offset(skip)
        .limit(limit)
    )
    if status:
        q = q.where(TrolleySession.status == status)
    result = await db.execute(q)
    sessions = result.scalars().all()
    return [
        {
            "id":           s.id,
            "token":        str(s.session_token),
            "trolley_id":   s.trolley_id,
            "status":       s.status,
            "total_amount": float(s.total_amount),
            "item_count":   s.item_count,
            "started_at":   s.started_at.isoformat() if s.started_at else None,
        }
        for s in sessions
    ]


@router.get("/mismatches", response_model=list[MismatchLogOut])
async def mismatch_logs(
    resolved: bool | None = Query(None),
    skip:     int = Query(0, ge=0),
    limit:    int = Query(50, le=200),
    db:       AsyncSession = Depends(get_db),
):
    q = select(MismatchLog).order_by(desc(MismatchLog.created_at)).offset(skip).limit(limit)
    if resolved is not None:
        q = q.where(MismatchLog.resolved == resolved)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/mismatches/{log_id}/resolve")
async def resolve_mismatch(
    log_id:  int,
    notes:   str | None = None,
    db:      AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    log = await db.get(MismatchLog, log_id)
    if not log:
        from fastapi import HTTPException
        raise HTTPException(404, "Mismatch log not found")
    log.resolved = True
    log.resolved_at = datetime.now(timezone.utc)
    log.resolution_notes = notes
    await db.commit()
    return {"resolved": True}


@router.get("/payments", response_model=list[PaymentStatusOut])
async def payment_logs(
    status: str | None = Query(None),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(50, le=200),
    db:     AsyncSession = Depends(get_db),
):
    q = select(Transaction).order_by(desc(Transaction.initiated_at)).offset(skip).limit(limit)
    if status:
        q = q.where(Transaction.status == status)
    result = await db.execute(q)
    return result.scalars().all()
