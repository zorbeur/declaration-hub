"""
Modèle pour le journal d'activité complet.
Trace toutes les actions pour l'audit et la sécurité.
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
import uuid

from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, Index, ForeignKey
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.orm import relationship

from app.core.database import Base


class ActivityAction(str, PyEnum):
    """Types d'actions loggées."""
    # Authentification
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    TWO_FACTOR_ENABLED = "two_factor_enabled"
    TWO_FACTOR_DISABLED = "two_factor_disabled"
    TWO_FACTOR_VERIFIED = "two_factor_verified"
    TWO_FACTOR_FAILED = "two_factor_failed"
    
    # Déclarations
    DECLARATION_CREATED = "declaration_created"
    DECLARATION_VALIDATED = "declaration_validated"
    DECLARATION_REJECTED = "declaration_rejected"
    DECLARATION_STATUS_CHANGED = "declaration_status_changed"
    DECLARATION_PRIORITY_CHANGED = "declaration_priority_changed"
    DECLARATION_DELETED = "declaration_deleted"
    
    # Indices
    TIP_SUBMITTED = "tip_submitted"
    TIP_READ = "tip_read"
    TIP_EVALUATED = "tip_evaluated"
    
    # Messages
    MESSAGE_SENT = "message_sent"
    MESSAGE_READ = "message_read"
    
    # Administration
    USER_CREATED = "user_created"
    USER_ROLE_CHANGED = "user_role_changed"
    USER_DEACTIVATED = "user_deactivated"
    
    # Données
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"
    DATA_BACKUP = "data_backup"


class ActivityLog(Base):
    """Journal d'activité pour l'audit."""
    __tablename__ = "activity_logs"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Action
    action = Column(Enum(ActivityAction), nullable=False)
    
    # Acteur (peut être null pour les actions anonymes)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String(50), nullable=True)  # Copie pour historique si user supprimé
    
    # Cible de l'action
    target_type = Column(String(50), nullable=True)  # "declaration", "user", "tip", etc.
    target_id = Column(CHAR(36), nullable=True)
    
    # Détails additionnels
    details = Column(JSON, default=dict)
    
    # Métadonnées de la requête
    ip_address = Column(String(45), nullable=True)  # IPv6 peut faire jusqu'à 45 chars
    user_agent = Column(String(500), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relation
    user = relationship("User", back_populates="activity_logs")
    
    __table_args__ = (
        Index('idx_activity_action', 'action'),
        Index('idx_activity_user', 'user_id'),
        Index('idx_activity_target', 'target_type', 'target_id'),
        Index('idx_activity_created', 'created_at'),
    )
