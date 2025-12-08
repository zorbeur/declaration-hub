"""
Module de sécurité avec authentification JWT et hashing sécurisé.
Utilise Argon2 pour le hashing des mots de passe (recommandé par OWASP).
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

# Argon2 est plus sécurisé que bcrypt pour le hashing
ph = PasswordHasher(
    time_cost=3,        # Nombre d'itérations
    memory_cost=65536,  # Mémoire utilisée (64MB)
    parallelism=4,      # Threads parallèles
    hash_len=32,        # Longueur du hash
    salt_len=16         # Longueur du sel
)


class TokenPayload(BaseModel):
    """Structure du payload JWT."""
    sub: str
    exp: datetime
    iat: datetime
    jti: str  # JWT ID unique pour révocation
    type: str  # "access" ou "refresh"


def hash_password(password: str) -> str:
    """Hash un mot de passe avec Argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe contre son hash."""
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHash):
        return False


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Crée un token JWT d'accès."""
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(32),
        "type": "access"
    }
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Crée un token JWT de rafraîchissement."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(32),
        "type": "refresh"
    }
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[TokenPayload]:
    """Décode et valide un token JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return TokenPayload(**payload)
    except JWTError:
        return None


def generate_tracking_code() -> str:
    """
    Génère un code de suivi sécurisé et aléatoire.
    Format: XXXX-XXXX-XXXX (lettres et chiffres)
    """
    alphabet = string.ascii_uppercase + string.digits
    # Exclure les caractères ambigus (0, O, I, L, 1)
    safe_alphabet = ''.join(c for c in alphabet if c not in '0OIL1')
    
    parts = []
    for _ in range(3):
        part = ''.join(secrets.choice(safe_alphabet) for _ in range(4))
        parts.append(part)
    
    return '-'.join(parts)


def generate_otp_code() -> str:
    """Génère un code OTP à 6 chiffres."""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Nettoie une entrée utilisateur.
    Supprime les caractères dangereux et limite la longueur.
    """
    import bleach
    
    # Nettoyer le HTML
    cleaned = bleach.clean(text, tags=[], strip=True)
    
    # Limiter la longueur
    return cleaned[:max_length].strip()
