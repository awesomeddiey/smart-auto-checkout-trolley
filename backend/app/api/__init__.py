from fastapi import APIRouter
from app.api import products, sessions, checkout, payment, recipes, admin

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(products.router)
api_router.include_router(sessions.router)
api_router.include_router(checkout.router)
api_router.include_router(payment.router)
api_router.include_router(recipes.router)
api_router.include_router(admin.router)
