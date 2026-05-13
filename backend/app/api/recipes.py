from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.recipe_service import (
    search_recipes, get_recipe_by_slug, build_shopping_list, get_store_map,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("/search")
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    recipes = await search_recipes(db, q)
    return [
        {
            "id":           r.id,
            "name":         r.name,
            "slug":         r.slug,
            "description":  r.description,
            "servings":     r.servings,
            "prep_time":    r.prep_time,
            "cook_time":    r.cook_time,
            "tags":         r.tags,
            "image_url":    r.image_url,
            "item_count":   len(r.items),
            "shopping_list": build_shopping_list(r),
        }
        for r in recipes
    ]


@router.get("/{slug}")
async def get_recipe(slug: str, db: AsyncSession = Depends(get_db)):
    recipe = await get_recipe_by_slug(db, slug)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    return {
        "id":            recipe.id,
        "name":          recipe.name,
        "slug":          recipe.slug,
        "description":   recipe.description,
        "servings":      recipe.servings,
        "prep_time":     recipe.prep_time,
        "cook_time":     recipe.cook_time,
        "tags":          recipe.tags,
        "shopping_list": build_shopping_list(recipe),
    }


@router.get("/store/map")
async def store_map(db: AsyncSession = Depends(get_db)):
    return await get_store_map(db)


@router.get("/store/navigate/{product_id}")
async def navigate(product_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.product import Product
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.aisle))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if not product.aisle:
        return {"product_id": product_id, "aisle": None, "message": "No aisle mapping for this product"}
    a = product.aisle
    return {
        "product_id":    product_id,
        "product_name":  product.name,
        "shelf_position": product.shelf_position,
        "aisle": {
            "code":  a.aisle_code,
            "name":  a.aisle_name,
            "x":     float(a.x_position),
            "y":     float(a.y_position),
            "width": float(a.width),
            "height": float(a.height),
        },
    }
