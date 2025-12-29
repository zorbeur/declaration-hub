"""
Configuration sécurisée de l'application.
Toutes les valeurs sensibles sont chargées depuis les variables d'environnement.
"""
import secrets
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Configuration de l'application avec validation Pydantic."""
    
    # Application
    APP_NAME: str = "DeclarationAPI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Sécurité
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(64))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Base de données
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/declarations.db"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # CORS - Domaines autorisés (à configurer selon votre frontend)
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    
    # Taille maximale des fichiers (en bytes) - 10MB
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    
    # Formats de fichiers autorisés
    ALLOWED_FILE_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
    ]
    
    # Répertoire d'upload
    UPLOAD_DIR: str = "./data/uploads"
    
    # Mobile Money Configuration
    FLOOZ_API_URL: str = ""
    FLOOZ_MERCHANT_ID: str = ""
    FLOOZ_API_KEY: str = ""
    FLOOZ_WEBHOOK_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    TMONEY_API_URL: str = ""
    TMONEY_MERCHANT_ID: str = ""
    TMONEY_API_KEY: str = ""
    TMONEY_WEBHOOK_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    
    # Montant des frais de déclaration (en FCFA)
    DECLARATION_FEE: int = 1000
    
    # Admin initial (à changer après premier démarrage)
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = Field(default_factory=lambda: secrets.token_urlsafe(16))
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Retourne les settings en cache pour éviter de recharger à chaque appel."""
    return Settings()
