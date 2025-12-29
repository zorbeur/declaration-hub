"""
Export des routers API.
"""
from app.api.routes.auth import router as auth_router
from app.api.routes.declarations import router as declarations_router
from app.api.routes.tips import router as tips_router
from app.api.routes.payments import router as payments_router
from app.api.routes.files import router as files_router

__all__ = [
    "auth_router",
    "declarations_router",
    "tips_router",
    "payments_router",
    "files_router",
]
