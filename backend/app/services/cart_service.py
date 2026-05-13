import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.session import TrolleySession, TrolleyItem
from app.services.websocket_manager import ws_manager


async def create_session(db: AsyncSession, trolley_id: Optional[str] = None) -> TrolleySession:
    session = TrolleySession(
        session_token=uuid.uuid4(),
        trolley_id=trolley_id or f"TROLL-{uuid.uuid4().hex[:6].upper()}",
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, token: str) -> Optional[TrolleySession]:
    result = await db.execute(
        select(TrolleySession)
        .options(
            selectinload(TrolleySession.items)
            .selectinload(TrolleyItem.product)
            .selectinload(Product.category),
            selectinload(TrolleySession.items)
            .selectinload(TrolleyItem.product)
            .selectinload(Product.aisle),
        )
        .where(TrolleySession.session_token == token)
    )
    return result.scalar_one_or_none()


async def get_session_by_id(db: AsyncSession, session_id: int) -> Optional[TrolleySession]:
    result = await db.execute(
        select(TrolleySession)
        .options(
            selectinload(TrolleySession.items).selectinload(TrolleyItem.product),
        )
        .where(TrolleySession.id == session_id)
    )
    return result.scalar_one_or_none()


async def add_item(
    db: AsyncSession,
    session: TrolleySession,
    product: Product,
) -> TrolleyItem:
    item = TrolleyItem(
        session_id=session.id,
        product_id=product.id,
        unit_price=product.price,
        quantity=1,
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # eager-load product for serialization
    await db.refresh(item, ["product"])

    await ws_manager.send(
        str(session.session_token),
        "item_added",
        {
            "item_id":    item.id,
            "product_id": product.id,
            "name":       product.name,
            "price":      float(product.price),
            "status":     item.status,
        },
    )
    return item


async def update_item_status(
    db: AsyncSession,
    item: TrolleyItem,
    status: str,
    vision_verified: Optional[bool] = None,
    weight_verified: Optional[bool] = None,
    vision_confidence: Optional[float] = None,
    detected_class: Optional[str] = None,
    weight_delta: Optional[float] = None,
) -> TrolleyItem:
    item.status = status
    if vision_verified is not None:
        item.vision_verified = vision_verified
    if weight_verified is not None:
        item.weight_verified = weight_verified
    if vision_confidence is not None:
        item.vision_confidence = Decimal(str(vision_confidence))
    if detected_class is not None:
        item.detected_class = detected_class
    if weight_delta is not None:
        item.weight_delta_grams = Decimal(str(weight_delta))
    if status == "verified":
        item.verified_at = datetime.now(timezone.utc)
    if status == "removed":
        item.removed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(item)

    session = await db.get(TrolleySession, item.session_id)
    if session:
        await ws_manager.send(
            str(session.session_token),
            "item_updated",
            {"item_id": item.id, "status": status, "vision_verified": item.vision_verified, "weight_verified": item.weight_verified},
        )
    return item


async def remove_item(db: AsyncSession, item: TrolleyItem) -> TrolleyItem:
    return await update_item_status(db, item, "removed")


async def get_item(db: AsyncSession, item_id: int) -> Optional[TrolleyItem]:
    result = await db.execute(
        select(TrolleyItem)
        .options(selectinload(TrolleyItem.product))
        .where(TrolleyItem.id == item_id)
    )
    return result.scalar_one_or_none()


async def has_flagged_items(session: TrolleySession) -> bool:
    active_items = [i for i in session.items if i.status != "removed"]
    return any(i.status == "flagged" for i in active_items)


async def all_items_verified(session: TrolleySession) -> bool:
    active_items = [i for i in session.items if i.status != "removed"]
    if not active_items:
        return False
    return all(i.status == "verified" for i in active_items)
