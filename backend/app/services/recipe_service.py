"""Recipe and shopping assistant service."""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.transaction import Recipe, RecipeItem
from app.models.product import Product, AisleMap


async def search_recipes(db: AsyncSession, query: str) -> list[Recipe]:
    q = f"%{query.lower()}%"
    result = await db.execute(
        select(Recipe)
        .options(
            selectinload(Recipe.items).selectinload(RecipeItem.product).selectinload(Product.aisle),
        )
        .where(
            Recipe.is_active == True,
            or_(
                Recipe.name.ilike(q),
                Recipe.description.ilike(q),
                Recipe.tags.cast("text").ilike(q),
            ),
        )
        .limit(5)
    )
    return result.scalars().all()


async def get_recipe_by_slug(db: AsyncSession, slug: str) -> Recipe | None:
    result = await db.execute(
        select(Recipe)
        .options(
            selectinload(Recipe.items).selectinload(RecipeItem.product).selectinload(Product.aisle),
        )
        .where(Recipe.slug == slug, Recipe.is_active == True)
    )
    return result.scalar_one_or_none()


def build_shopping_list(recipe: Recipe) -> list[dict]:
    shopping_list = []
    for item in recipe.items:
        entry: dict = {
            "ingredient":  item.ingredient,
            "quantity":    float(item.quantity) if item.quantity else None,
            "unit":        item.unit,
            "notes":       item.notes,
            "product":     None,
            "aisle":       None,
            "shelf":       None,
        }
        if item.product:
            p = item.product
            entry["product"] = {
                "id":       p.id,
                "name":     p.name,
                "price":    float(p.price),
                "sku":      p.sku,
                "barcode":  p.barcode,
                "image_url": p.image_url,
            }
            if p.aisle:
                entry["aisle"] = {
                    "code":      p.aisle.aisle_code,
                    "name":      p.aisle.aisle_name,
                    "x":         float(p.aisle.x_position),
                    "y":         float(p.aisle.y_position),
                }
            entry["shelf"] = p.shelf_position
        shopping_list.append(entry)
    return shopping_list


async def get_store_map(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(AisleMap))
    aisles = result.scalars().all()
    return [
        {
            "id":          a.id,
            "aisle_code":  a.aisle_code,
            "aisle_name":  a.aisle_name,
            "x":           float(a.x_position),
            "y":           float(a.y_position),
            "width":       float(a.width),
            "height":      float(a.height),
            "description": a.description,
        }
        for a in aisles
    ]
