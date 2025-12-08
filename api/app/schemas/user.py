"""
Schémas Pydantic pour les utilisateurs.
Validation stricte des entrées pour la sécurité.
"""
from datetime import datetime
from typing import Optional, List
import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


# Regex pour validation
USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_]{3,50}$')
PASSWORD_MIN_LENGTH = 12
PASSWORD_REGEX = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$'
)


class UserBase(BaseModel):
    """Schéma de base pour les utilisateurs."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_REGEX.match(v):
            raise ValueError(
                'Le nom d\'utilisateur doit contenir uniquement des lettres, '
                'chiffres et underscores (3-50 caractères)'
            )
        return v.lower()


class UserCreate(UserBase):
    """Schéma pour la création d'utilisateur."""
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH)
    enable_2fa: bool = False
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f'Le mot de passe doit faire au moins {PASSWORD_MIN_LENGTH} caractères')
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                'Le mot de passe doit contenir au moins: '
                '1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)'
            )
        return v


class UserLogin(BaseModel):
    """Schéma pour la connexion."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Schéma pour la mise à jour d'utilisateur."""
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    """Schéma pour le changement de mot de passe."""
    current_password: str
    new_password: str = Field(..., min_length=PASSWORD_MIN_LENGTH)
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                'Le nouveau mot de passe doit contenir au moins: '
                '1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)'
            )
        return v


class TwoFactorVerify(BaseModel):
    """Schéma pour la vérification 2FA."""
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')


class UserResponse(UserBase):
    """Schéma de réponse pour les utilisateurs."""
    id: str
    two_factor_enabled: bool
    is_active: bool
    is_verified: bool
    roles: List[UserRole]
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schéma de réponse pour les tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    """Schéma pour rafraîchir un token."""
    refresh_token: str
