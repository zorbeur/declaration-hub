"""
Configuration de la base de données SQLite avec SQLAlchemy async.
Inclut des mesures de sécurité pour SQLite.
"""
import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event

from app.core.config import get_settings

settings = get_settings()

# Créer le dossier data s'il n'existe pas
data_dir = Path("./data")
data_dir.mkdir(exist_ok=True)

# Configuration du moteur SQLite async
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    # SQLite ne supporte pas le pool de connexions de la même manière
    pool_pre_ping=True,
)

# Session factory async
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base pour les modèles
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    Dependency injection pour obtenir une session de base de données.
    Utilise un context manager pour garantir la fermeture.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Initialise la base de données.
    Crée toutes les tables si elles n'existent pas.
    """
    async with engine.begin() as conn:
        # Importer tous les modèles pour les enregistrer
        from app.models import user, declaration, tip, activity_log
        
        # Créer les tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Configurer les paramètres de sécurité SQLite
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        await conn.execute("PRAGMA secure_delete=ON")


async def close_db():
    """Ferme proprement la connexion à la base de données."""
    await engine.dispose()
