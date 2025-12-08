"""
Modèle pour les déclarations (pertes et plaintes).
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
import uuid

from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, Index, Integer
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class DeclarationType(str, PyEnum):
    """Types de déclaration."""
    PERTE = "perte"
    PLAINTE = "plainte"


class DeclarationStatus(str, PyEnum):
    """Statuts possibles d'une déclaration."""
    EN_ATTENTE = "en_attente"
    VALIDEE = "validee"
    REJETEE = "rejetee"
    EN_COURS = "en_cours"
    RESOLUE = "resolue"
    CLASSEE = "classee"


class DeclarationPriority(str, PyEnum):
    """Niveaux de priorité."""
    BASSE = "basse"
    MOYENNE = "moyenne"
    IMPORTANTE = "importante"
    URGENTE = "urgente"


class Declaration(Base):
    """Modèle principal pour les déclarations."""
    __tablename__ = "declarations"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tracking_code = Column(String(20), unique=True, nullable=False, index=True)
    
    # Type et catégorie
    type = Column(Enum(DeclarationType), nullable=False)
    category = Column(String(100), nullable=False)
    
    # Détails
    description = Column(Text, nullable=False)
    incident_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(500), nullable=True)
    
    # Récompense (pour les pertes uniquement)
    reward = Column(String(100), nullable=True)
    
    # Informations de contact (chiffrées ou hashées en production)
    declarant_name = Column(String(255), nullable=True)
    declarant_phone = Column(String(20), nullable=True)
    declarant_email = Column(String(255), nullable=True)
    
    # Statut et priorité
    status = Column(Enum(DeclarationStatus), default=DeclarationStatus.EN_ATTENTE)
    priority = Column(Enum(DeclarationPriority), default=DeclarationPriority.MOYENNE)
    
    # Pièces jointes (stockées en JSON pour SQLite)
    attachments = Column(JSON, default=list)
    
    # Métadonnées techniques
    metadata = Column(JSON, default=dict)
    
    # Historique des changements de statut
    status_history = Column(JSON, default=list)
    
    # Notes administratives (jamais exposées publiquement)
    admin_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relations
    tips = relationship("Tip", back_populates="declaration", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="declaration", cascade="all, delete-orphan")
    
    # Index pour les recherches fréquentes
    __table_args__ = (
        Index('idx_declaration_status', 'status'),
        Index('idx_declaration_type', 'type'),
        Index('idx_declaration_priority', 'priority'),
        Index('idx_declaration_created', 'created_at'),
        Index('idx_declaration_type_status', 'type', 'status'),
    )


class Message(Base):
    """Messages liés à une déclaration (communication admin-déclarant)."""
    __tablename__ = "messages"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    declaration_id = Column(CHAR(36), ForeignKey("declarations.id", ondelete="CASCADE"), nullable=False)
    
    # Contenu
    content = Column(Text, nullable=False)
    
    # Expéditeur
    sender_type = Column(String(20), nullable=False)  # "admin" ou "declarant"
    sender_id = Column(CHAR(36), nullable=True)  # ID de l'admin si applicable
    
    # Statut
    is_read = Column(Integer, default=0)  # SQLite n'a pas de vrai Boolean
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relation
    declaration = relationship("Declaration", back_populates="messages")
    
    __table_args__ = (
        Index('idx_message_declaration', 'declaration_id'),
        Index('idx_message_read', 'is_read'),
    )
