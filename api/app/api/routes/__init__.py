"""
Export des routers API.
"""
from app.api.routes.auth import router as auth_router
from app.api.routes.declarations import router as declarations_router
from app.api.routes.tips import router as tips_router

__all__ = [
    "auth_router",
    "declarations_router",
    "tips_router",
]
