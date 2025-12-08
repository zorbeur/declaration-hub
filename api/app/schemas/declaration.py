"""
Schémas Pydantic pour les déclarations.
Validation stricte pour la sécurité et l'intégrité des données.
"""
from datetime import datetime
from typing import Optional, List, Any
import re

from pydantic import BaseModel, Field, field_validator

from app.models.declaration import DeclarationType, DeclarationStatus, DeclarationPriority


# Regex pour validation du téléphone (+228 suivi de 8 chiffres)
PHONE_REGEX = re.compile(r'^\+228[0-9]{8}$')


class AttachmentBase(BaseModel):
    """Schéma pour les pièces jointes."""
    filename: str = Field(..., max_length=255)
    content_type: str
    size: int
    data: Optional[str] = None  # Base64 encoded


class DeclarationBase(BaseModel):
    """Schéma de base pour les déclarations."""
    type: DeclarationType
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    incident_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=500)
    
    @field_validator('description')
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        # Supprimer les balises HTML potentielles
        import bleach
        return bleach.clean(v, tags=[], strip=True)[:5000]
    
    @field_validator('location')
    @classmethod
    def sanitize_location(cls, v: Optional[str]) -> Optional[str]:
        if v:
            import bleach
            return bleach.clean(v, tags=[], strip=True)[:500]
        return v


class DeclarationCreate(DeclarationBase):
    """Schéma pour la création de déclaration."""
    declarant_name: Optional[str] = Field(None, max_length=255)
    declarant_phone: Optional[str] = Field(None, max_length=20)
    declarant_email: Optional[str] = Field(None, max_length=255)
    reward: Optional[str] = Field(None, max_length=100)
    attachments: Optional[List[AttachmentBase]] = []
    
    # Captcha pour anti-spam
    captcha_answer: int
    captcha_expected: int
    
    @field_validator('declarant_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and not PHONE_REGEX.match(v):
            raise ValueError('Le numéro de téléphone doit être au format +228XXXXXXXX')
        return v
    
    @field_validator('captcha_answer')
    @classmethod
    def validate_captcha(cls, v: int, info) -> int:
        expected = info.data.get('captcha_expected')
        if expected is not None and v != expected:
            raise ValueError('Réponse captcha incorrecte')
        return v


class DeclarationUpdate(BaseModel):
    """Schéma pour la mise à jour admin d'une déclaration."""
    status: Optional[DeclarationStatus] = None
    priority: Optional[DeclarationPriority] = None
    admin_notes: Optional[str] = Field(None, max_length=2000)
    status_comment: Optional[str] = Field(None, max_length=500)


class DeclarationPublicResponse(BaseModel):
    """Schéma de réponse publique (sans données sensibles)."""
    id: str
    tracking_code: str
    type: DeclarationType
    category: str
    description: str
    incident_date: Optional[datetime]
    location: Optional[str]  # Version tronquée/anonymisée
    reward: Optional[str]
    status: DeclarationStatus
    priority: DeclarationPriority
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeclarationAdminResponse(DeclarationPublicResponse):
    """Schéma de réponse admin (toutes les données)."""
    declarant_name: Optional[str]
    declarant_phone: Optional[str]
    declarant_email: Optional[str]
    admin_notes: Optional[str]
    metadata: dict
    status_history: List[dict]
    attachments: List[dict]
    updated_at: Optional[datetime]
    tips_count: int = 0
    unread_tips_count: int = 0
    messages_count: int = 0
    unread_messages_count: int = 0


class DeclarationTrackResponse(BaseModel):
    """Schéma de réponse pour le suivi par code."""
    tracking_code: str
    type: DeclarationType
    category: str
    status: DeclarationStatus
    priority: DeclarationPriority
    created_at: datetime
    last_update: Optional[datetime]
    status_history: List[dict]  # Sans détails sensibles


class DeclarationListResponse(BaseModel):
    """Schéma pour la liste paginée."""
    items: List[DeclarationPublicResponse]
    total: int
    page: int
    per_page: int
    pages: int
