# app/api/v1/api.py

from fastapi import APIRouter

from app.api.v1.endpoints import (auth, users, orders, responses, reviews, admin_reviews,support, admin_support,admin_users, admin_orders, admin_stats,)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(responses.router, tags=["responses"])
api_router.include_router(reviews.router, tags=["reviews"])
api_router.include_router(admin_reviews.router, tags=["admin"])
api_router.include_router(support.router, tags=["support"])
api_router.include_router(admin_support.router, tags=["admin"])
api_router.include_router(admin_users.router, tags=["admin"])
api_router.include_router(admin_orders.router, tags=["admin"])
api_router.include_router(admin_stats.router, tags=["admin"])