"""
Dépendances d'injection pour les routes API.
Gestion de l'authentification et des permissions.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole, UserRoleAssociation

# Schéma de sécurité Bearer
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur courant à partir du token JWT.
    Lève une exception si le token est invalide ou expiré.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = decode_token(credentials.credentials)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if token_data.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Type de token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Récupérer l'utilisateur
    result = await db.execute(
        select(User).where(User.id == token_data.sub)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )
    
    if user.locked_until:
        from datetime import datetime, timezone
        if user.locked_until > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte temporairement verrouillé",
            )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Récupère l'utilisateur courant si authentifié, sinon None.
    Utile pour les routes accessibles avec ou sans auth.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def has_role(user: User, role: UserRole, db: AsyncSession) -> bool:
    """
    Vérifie si un utilisateur a un rôle spécifique.
    Requête séparée pour éviter les problèmes de sécurité.
    """
    result = await db.execute(
        select(UserRoleAssociation).where(
            UserRoleAssociation.user_id == user.id,
            UserRoleAssociation.role == role
        )
    )
    return result.scalar_one_or_none() is not None


async def require_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Vérifie que l'utilisateur courant est admin.
    """
    if not await has_role(current_user, UserRole.ADMIN, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Droits administrateur requis",
        )
    return current_user


async def require_moderator_or_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Vérifie que l'utilisateur est admin ou modérateur.
    """
    is_admin = await has_role(current_user, UserRole.ADMIN, db)
    is_mod = await has_role(current_user, UserRole.MODERATOR, db)
    
    if not (is_admin or is_mod):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Droits modérateur ou administrateur requis",
        )
    return current_user


def get_client_info(request: Request) -> dict:
    """
    Extrait les informations du client pour le logging.
    """
    # Obtenir l'IP réelle (derrière proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    return {
        "ip_address": ip,
        "user_agent": request.headers.get("User-Agent", "unknown")[:500],
    }
