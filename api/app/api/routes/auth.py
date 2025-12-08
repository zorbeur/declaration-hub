"""
Routes d'authentification.
Gestion de la connexion, inscription et 2FA.
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token,
    decode_token,
    generate_otp_code,
)
from app.core.config import get_settings
from app.models.user import User, UserRole, UserRoleAssociation
from app.models.activity_log import ActivityLog, ActivityAction
from app.schemas.user import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    TokenResponse, 
    TokenRefresh,
    TwoFactorVerify,
)
from app.api.deps import get_current_user, get_client_info

router = APIRouter(prefix="/auth", tags=["Authentification"])
settings = get_settings()

# Stockage temporaire des codes 2FA (en production, utiliser Redis)
pending_2fa: dict[str, dict] = {}

# Limite de tentatives de connexion
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=15)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Inscription d'un nouvel utilisateur.
    Le premier utilisateur devient automatiquement admin.
    """
    # Vérifier si c'est le premier utilisateur
    result = await db.execute(select(User).limit(1))
    is_first_user = result.scalar_one_or_none() is None
    
    # Vérifier si le username existe
    result = await db.execute(
        select(User).where(User.username == user_data.username.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur est déjà pris"
        )
    
    # Vérifier si l'email existe
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    
    # Créer l'utilisateur
    user = User(
        username=user_data.username.lower(),
        email=user_data.email.lower(),
        hashed_password=hash_password(user_data.password),
        two_factor_enabled=user_data.enable_2fa,
        is_verified=is_first_user,  # Premier user auto-vérifié
        last_password_change=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()
    
    # Attribuer le rôle (admin pour le premier, user pour les autres)
    role = UserRole.ADMIN if is_first_user else UserRole.USER
    role_assoc = UserRoleAssociation(
        user_id=user.id,
        role=role,
    )
    db.add(role_assoc)
    
    # Logger l'action
    client_info = get_client_info(request)
    log = ActivityLog(
        action=ActivityAction.USER_CREATED,
        user_id=user.id,
        username=user.username,
        target_type="user",
        target_id=user.id,
        details={"is_first_user": is_first_user, "role": role.value},
        **client_info
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(user)
    
    # Construire la réponse
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        two_factor_enabled=user.two_factor_enabled,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=[role],
        last_login=user.last_login,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Connexion d'un utilisateur.
    Retourne un token JWT ou demande le 2FA si activé.
    """
    client_info = get_client_info(request)
    
    # Récupérer l'utilisateur
    result = await db.execute(
        select(User).where(User.username == credentials.username.lower())
    )
    user = result.scalar_one_or_none()
    
    # Vérification du compte
    if not user:
        # Logger tentative échouée (sans révéler que l'user n'existe pas)
        log = ActivityLog(
            action=ActivityAction.LOGIN_FAILED,
            details={"reason": "invalid_credentials"},
            **client_info
        )
        db.add(log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects"
        )
    
    # Vérifier le verrouillage
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = (user.locked_until - datetime.now(timezone.utc)).seconds // 60
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Compte verrouillé. Réessayez dans {remaining} minutes."
        )
    
    # Vérifier le mot de passe
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + LOCKOUT_DURATION
            user.failed_login_attempts = 0
        
        log = ActivityLog(
            action=ActivityAction.LOGIN_FAILED,
            user_id=user.id,
            username=user.username,
            details={"attempts": user.failed_login_attempts},
            **client_info
        )
        db.add(log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects"
        )
    
    # Vérifier si le compte est actif
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    
    # Si 2FA activé, générer un code
    if user.two_factor_enabled:
        otp_code = generate_otp_code()
        pending_2fa[user.id] = {
            "code": otp_code,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "client_info": client_info,
        }
        
        # En production, envoyer le code par email/SMS
        # Pour le dev, on le retourne (à supprimer en prod!)
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail={
                "message": "Code 2FA requis",
                "user_id": user.id,
                "demo_code": otp_code  # À SUPPRIMER EN PRODUCTION
            }
        )
    
    # Reset tentatives et mise à jour
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    
    # Logger succès
    log = ActivityLog(
        action=ActivityAction.LOGIN_SUCCESS,
        user_id=user.id,
        username=user.username,
        **client_info
    )
    db.add(log)
    await db.commit()
    
    # Générer les tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/verify-2fa", response_model=TokenResponse)
async def verify_2fa(
    user_id: str,
    verification: TwoFactorVerify,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Vérification du code 2FA.
    """
    client_info = get_client_info(request)
    
    # Vérifier si une vérification est en attente
    pending = pending_2fa.get(user_id)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune vérification 2FA en attente"
        )
    
    # Vérifier l'expiration
    if pending["expires_at"] < datetime.now(timezone.utc):
        del pending_2fa[user_id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code expiré, veuillez vous reconnecter"
        )
    
    # Vérifier le code
    if verification.code != pending["code"]:
        log = ActivityLog(
            action=ActivityAction.TWO_FACTOR_FAILED,
            user_id=user_id,
            details={"reason": "invalid_code"},
            **client_info
        )
        db.add(log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code incorrect"
        )
    
    # Supprimer le code pending
    del pending_2fa[user_id]
    
    # Récupérer l'utilisateur
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    # Mise à jour
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    
    # Logger succès
    log = ActivityLog(
        action=ActivityAction.TWO_FACTOR_VERIFIED,
        user_id=user.id,
        username=user.username,
        **client_info
    )
    db.add(log)
    await db.commit()
    
    # Générer les tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """
    Rafraîchit un token d'accès.
    """
    payload = decode_token(token_data.refresh_token)
    
    if not payload or payload.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de rafraîchissement invalide"
        )
    
    # Vérifier que l'utilisateur existe toujours
    result = await db.execute(select(User).where(User.id == payload.sub))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur invalide"
        )
    
    # Générer de nouveaux tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Déconnexion (invalide le token côté client).
    En production avec Redis, on ajouterait le token à une blacklist.
    """
    client_info = get_client_info(request)
    
    log = ActivityLog(
        action=ActivityAction.LOGOUT,
        user_id=current_user.id,
        username=current_user.username,
        **client_info
    )
    db.add(log)
    await db.commit()
    
    return {"message": "Déconnexion réussie"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère les informations de l'utilisateur connecté.
    """
    # Récupérer les rôles
    result = await db.execute(
        select(UserRoleAssociation.role).where(
            UserRoleAssociation.user_id == current_user.id
        )
    )
    roles = [row[0] for row in result.fetchall()]
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        two_factor_enabled=current_user.two_factor_enabled,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        roles=roles,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
    )
