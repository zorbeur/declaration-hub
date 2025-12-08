"""
Modèle utilisateur (administrateur) avec gestion des rôles.
Les rôles sont stockés dans une table séparée pour éviter les attaques d'escalade de privilèges.
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional
import uuid

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, Index
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserRole(str, PyEnum):
    """Rôles disponibles dans le système."""
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"


class User(Base):
    """Modèle utilisateur pour les administrateurs."""
    __tablename__ = "users"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # 2FA
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    
    # État du compte
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Sécurité
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_password_change = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relations
    roles = relationship("UserRoleAssociation", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")
    
    # Index pour les recherches fréquentes
    __table_args__ = (
        Index('idx_user_active', 'is_active'),
    )


class UserRoleAssociation(Base):
    """
    Table de liaison pour les rôles utilisateurs.
    Séparée pour éviter les attaques d'escalade de privilèges.
    """
    __tablename__ = "user_roles"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    
    # Qui a attribué ce rôle
    granted_by = Column(CHAR(36), ForeignKey("users.id"), nullable=True)
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relation
    user = relationship("User", foreign_keys=[user_id], back_populates="roles")
    
    # Contrainte d'unicité: un utilisateur ne peut avoir un rôle qu'une fois
    __table_args__ = (
        Index('idx_user_role', 'user_id', 'role', unique=True),
    )


# Import nécessaire pour SQLAlchemy
from sqlalchemy import Integer
