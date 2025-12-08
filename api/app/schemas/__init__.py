"""
Exports des schémas Pydantic.
"""
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    PasswordChange,
    TwoFactorVerify,
    TokenResponse,
    TokenRefresh,
)
from app.schemas.declaration import (
    DeclarationCreate,
    DeclarationUpdate,
    DeclarationPublicResponse,
    DeclarationAdminResponse,
    DeclarationTrackResponse,
    DeclarationListResponse,
    AttachmentBase,
)
from app.schemas.tip import (
    TipCreate,
    TipPublicResponse,
    TipAdminResponse,
    TipUpdate,
    TipListResponse,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserUpdate",
    "UserResponse",
    "PasswordChange",
    "TwoFactorVerify",
    "TokenResponse",
    "TokenRefresh",
    # Declaration
    "DeclarationCreate",
    "DeclarationUpdate",
    "DeclarationPublicResponse",
    "DeclarationAdminResponse",
    "DeclarationTrackResponse",
    "DeclarationListResponse",
    "AttachmentBase",
    # Tip
    "TipCreate",
    "TipPublicResponse",
    "TipAdminResponse",
    "TipUpdate",
    "TipListResponse",
]
