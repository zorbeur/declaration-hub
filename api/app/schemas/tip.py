"""
Schémas Pydantic pour les indices/signalements.
"""
from datetime import datetime
from typing import Optional, List
import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.declaration import AttachmentBase


# Regex pour validation du téléphone
PHONE_REGEX = re.compile(r'^\+228[0-9]{8}$')


class TipCreate(BaseModel):
    """Schéma pour la création d'un indice."""
    declaration_id: str
    tipster_phone: Optional[str] = Field(None, max_length=20)
    description: str = Field(..., min_length=10, max_length=2000)
    attachments: Optional[List[AttachmentBase]] = []
    
    # Captcha pour anti-spam
    captcha_answer: int
    captcha_expected: int
    
    @field_validator('tipster_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and not PHONE_REGEX.match(v):
            raise ValueError('Le numéro de téléphone doit être au format +228XXXXXXXX')
        return v
    
    @field_validator('description')
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        import bleach
        return bleach.clean(v, tags=[], strip=True)[:2000]
    
    @field_validator('captcha_answer')
    @classmethod
    def validate_captcha(cls, v: int, info) -> int:
        expected = info.data.get('captcha_expected')
        if expected is not None and v != expected:
            raise ValueError('Réponse captcha incorrecte')
        return v


class TipPublicResponse(BaseModel):
    """Schéma de réponse publique (confirmation)."""
    id: str
    declaration_id: str
    created_at: datetime
    message: str = "Votre indice a été soumis avec succès"


class TipAdminResponse(BaseModel):
    """Schéma de réponse admin."""
    id: str
    declaration_id: str
    tipster_phone: Optional[str]
    description: str
    attachments: List[dict]
    is_read: bool
    is_useful: Optional[bool]
    admin_notes: Optional[str]
    metadata: dict
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    
    class Config:
        from_attributes = True


class TipUpdate(BaseModel):
    """Schéma pour la mise à jour admin d'un indice."""
    is_read: Optional[bool] = None
    is_useful: Optional[bool] = None
    admin_notes: Optional[str] = Field(None, max_length=1000)


class TipListResponse(BaseModel):
    """Schéma pour la liste des indices."""
    items: List[TipAdminResponse]
    total: int
    unread_count: int
