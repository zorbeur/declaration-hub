#!/usr/bin/env python3
"""
Script de démarrage de l'application.
Usage: python run.py
"""
import uvicorn
from app.core.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        # Sécurité: limiter les en-têtes de requête
        limit_max_fields=100,
        timeout_keep_alive=5,
        # Proxy headers (si derrière nginx/traefik)
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
