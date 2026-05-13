from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product
from app.schemas.session import (
    SessionCreate, SessionOut, ScanRequest, TrolleyItemOut, VerificationResult,
)
from app.services import cart_service, verification_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionOut, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = await cart_service.create_session(db, trolley_id=payload.trolley_id)
    return session


@router.get("/{token}", response_model=SessionOut)
async def get_session(token: str, db: AsyncSession = Depends(get_db)):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.post("/{token}/scan", response_model=TrolleyItemOut)
async def scan_item(
    token:              str,
    payload:            ScanRequest,
    background_tasks:   BackgroundTasks,
    db:                 AsyncSession = Depends(get_db),
):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status not in ("active",):
        raise HTTPException(400, f"Cannot add items to a session in status '{session.status}'")

    result = await db.execute(
        select(Product).where(Product.barcode == payload.barcode, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, f"Product not found for barcode '{payload.barcode}'")

    item = await cart_service.add_item(db, session, product)

    # run verification asynchronously
    background_tasks.add_task(_verify_item, db, item.id, product.id, token)

    await db.refresh(item, ["product"])
    return item


async def _verify_item(db: AsyncSession, item_id: int, product_id: int, token: str) -> None:
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as fresh_db:
        item = await cart_service.get_item(fresh_db, item_id)
        if not item:
            return
        product = await fresh_db.get(Product, product_id)
        if not product:
            return

        result = await verification_service.run_verification(fresh_db, item, product, token)
        await cart_service.update_item_status(
            fresh_db,
            item,
            status=result["status"],
            vision_verified=result["vision_verified"],
            weight_verified=result["weight_verified"],
            vision_confidence=result.get("vision_confidence"),
            detected_class=result.get("detected_class"),
            weight_delta=result.get("weight_delta"),
        )


@router.delete("/{token}/items/{item_id}", response_model=TrolleyItemOut)
async def remove_item(token: str, item_id: int, db: AsyncSession = Depends(get_db)):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")

    item = await cart_service.get_item(db, item_id)
    if not item or item.session_id != session.id:
        raise HTTPException(404, "Item not found in this session")

    item = await cart_service.remove_item(db, item)
    return item


@router.post("/{token}/abandon")
async def abandon_session(token: str, db: AsyncSession = Depends(get_db)):
    session = await cart_service.get_session(db, token)
    if not session:
        raise HTTPException(404, "Session not found")
    session.status = "abandoned"
    await db.commit()
    return {"message": "Session abandoned"}
