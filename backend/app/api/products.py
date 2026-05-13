from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.product import Product, Category, AisleMap
from app.schemas.product import ProductOut, ProductCreate, ProductUpdate, ProductLookupOut, CategoryOut, AisleMapOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/lookup/{barcode}", response_model=ProductLookupOut)
async def lookup_by_barcode(barcode: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.aisle),
        )
        .where(Product.barcode == barcode, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, f"Product with barcode '{barcode}' not found")
    return product


@router.get("/", response_model=list[ProductOut])
async def list_products(
    search:      str | None = Query(None),
    category_id: int | None = Query(None),
    skip:        int = Query(0, ge=0),
    limit:       int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).options(selectinload(Product.category), selectinload(Product.aisle))
    q = q.where(Product.is_active == True)
    if search:
        pattern = f"%{search}%"
        q = q.where(or_(Product.name.ilike(pattern), Product.sku.ilike(pattern)))
    if category_id:
        q = q.where(Product.category_id == category_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.aisle))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product, ["category", "aisle"])
    return product


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    payload:    ProductUpdate,
    db:         AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product, ["category", "aisle"])
    return product


@router.get("/categories/all", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    return result.scalars().all()


@router.get("/aisles/all", response_model=list[AisleMapOut])
async def list_aisles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AisleMap))
    return result.scalars().all()
