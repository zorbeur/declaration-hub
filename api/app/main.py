"""
Point d'entrée principal de l'API FastAPI.
Configuration de l'application avec tous les middlewares et routes.
"""
import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import init_db, close_db
from app.api.routes import auth_router, declarations_router, tips_router
from app.middleware.security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
)

settings = get_settings()

# Configuration du logging structuré
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestionnaire du cycle de vie de l'application.
    Initialise et ferme les ressources.
    """
    # Démarrage
    logger = structlog.get_logger()
    await logger.ainfo("Application démarrée", environment=settings.ENVIRONMENT)
    
    # Initialiser la base de données
    await init_db()
    await logger.ainfo("Base de données initialisée")
    
    yield
    
    # Arrêt
    await close_db()
    await logger.ainfo("Application arrêtée")


# Création de l'application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API sécurisée pour la gestion des déclarations de pertes et plaintes",
    docs_url="/docs" if settings.DEBUG else None,  # Désactiver Swagger en prod
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# === Middlewares (ordre important: dernier ajouté = premier exécuté) ===

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Headers de sécurité
app.add_middleware(SecurityHeadersMiddleware)

# Logging des requêtes
app.add_middleware(RequestLoggingMiddleware)


# === Routes ===

app.include_router(auth_router, prefix="/api/v1")
app.include_router(declarations_router, prefix="/api/v1")
app.include_router(tips_router, prefix="/api/v1")


# === Endpoints de base ===

@app.get("/")
async def root():
    """Endpoint racine."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Endpoint de santé pour les load balancers."""
    return {"status": "healthy"}


# === Gestionnaires d'erreurs ===

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Gestionnaire global des exceptions.
    Masque les détails d'erreur en production.
    """
    logger = structlog.get_logger()
    
    await logger.aerror(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne s'est produite"},
    )
