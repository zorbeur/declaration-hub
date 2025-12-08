"""
Modèle pour les indices/signalements soumis par les citoyens.
"""
from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, String, Text, DateTime, JSON, Index, Integer, ForeignKey
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class Tip(Base):
    """Indices soumis pour une déclaration."""
    __tablename__ = "tips"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    declaration_id = Column(CHAR(36), ForeignKey("declarations.id", ondelete="CASCADE"), nullable=False)
    
    # Informations du tipster (anonymisées)
    tipster_phone = Column(String(20), nullable=True)
    
    # Contenu
    description = Column(Text, nullable=False)
    
    # Pièces jointes
    attachments = Column(JSON, default=list)
    
    # Statut
    is_read = Column(Integer, default=0)
    is_useful = Column(Integer, nullable=True)  # 1 = utile, 0 = inutile, NULL = non évalué
    
    # Notes admin
    admin_notes = Column(Text, nullable=True)
    
    # Métadonnées techniques
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(CHAR(36), ForeignKey("users.id"), nullable=True)
    
    # Relations
    declaration = relationship("Declaration", back_populates="tips")
    
    __table_args__ = (
        Index('idx_tip_declaration', 'declaration_id'),
        Index('idx_tip_read', 'is_read'),
        Index('idx_tip_created', 'created_at'),
    )
