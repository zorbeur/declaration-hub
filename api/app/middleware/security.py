"""
Middleware de sécurité pour l'application.
Gestion des headers de sécurité, rate limiting, et logging.
"""
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import get_settings

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Ajoute les headers de sécurité recommandés par OWASP.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Headers de sécurité
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        # HSTS (à activer en production avec HTTPS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting basé sur l'IP.
    Utilise un stockage en mémoire (Redis recommandé en production).
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.blocked_ips: dict[str, float] = {}
    
    def _get_client_ip(self, request: Request) -> str:
        """Extrait l'IP du client (gère les proxys)."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _cleanup_old_requests(self, ip: str, window: int = 60):
        """Nettoie les anciennes requêtes hors de la fenêtre."""
        now = time.time()
        self.requests[ip] = [t for t in self.requests[ip] if now - t < window]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        ip = self._get_client_ip(request)
        now = time.time()
        
        # Vérifier si l'IP est bloquée
        if ip in self.blocked_ips:
            if now < self.blocked_ips[ip]:
                return Response(
                    content='{"detail": "Trop de requêtes. Réessayez plus tard."}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": str(int(self.blocked_ips[ip] - now))}
                )
            else:
                del self.blocked_ips[ip]
        
        # Nettoyer et compter les requêtes
        self._cleanup_old_requests(ip)
        
        # Vérifier la limite par minute
        if len(self.requests[ip]) >= settings.RATE_LIMIT_PER_MINUTE:
            self.blocked_ips[ip] = now + 60  # Bloquer pour 1 minute
            return Response(
                content='{"detail": "Limite de requêtes dépassée. Réessayez dans 1 minute."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"}
            )
        
        # Enregistrer la requête
        self.requests[ip].append(now)
        
        # Ajouter les headers de rate limit
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(
            settings.RATE_LIMIT_PER_MINUTE - len(self.requests[ip])
        )
        response.headers["X-RateLimit-Reset"] = str(int(now + 60))
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logging des requêtes pour audit et debugging.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        import structlog
        
        logger = structlog.get_logger()
        
        start_time = time.time()
        
        # Récupérer l'IP client
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )
        
        # Exécuter la requête
        response = await call_next(request)
        
        # Calculer le temps de traitement
        process_time = time.time() - start_time
        
        # Logger (ne pas logger les données sensibles)
        await logger.ainfo(
            "request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=f"{process_time:.3f}s",
            client_ip=client_ip,
            user_agent=request.headers.get("User-Agent", "unknown")[:100],
        )
        
        # Ajouter le header de temps de traitement
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        
        return response
