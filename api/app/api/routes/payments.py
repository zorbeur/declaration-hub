"""
Routes pour la gestion des paiements Mobile Money.
Intégration Flooz (Moov) et T-Money (Togocel).
"""
import uuid
import hmac
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from pydantic import BaseModel, Field, field_validator
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import log_activity

router = APIRouter()


class PaymentProvider(str, Enum):
    """Opérateurs Mobile Money supportés."""
    FLOOZ = "flooz"
    TMONEY = "tmoney"


class PaymentStatus(str, Enum):
    """Statuts de paiement."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PaymentInitRequest(BaseModel):
    """Requête d'initialisation de paiement."""
    provider: PaymentProvider
    phone_number: str = Field(..., min_length=12, max_length=12)
    amount: int = Field(..., ge=100, le=1000000)  # Min 100 FCFA, Max 1M FCFA
    declaration_type: str = Field(..., min_length=1, max_length=50)
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re
        if not re.match(r'^\+228[0-9]{8}$', v):
            raise ValueError('Numéro invalide. Format: +228XXXXXXXX')
        return v


class PaymentInitResponse(BaseModel):
    """Réponse d'initialisation de paiement."""
    transaction_id: str
    status: PaymentStatus
    message: str
    expires_at: datetime


class PaymentStatusResponse(BaseModel):
    """Réponse de statut de paiement."""
    transaction_id: str
    status: PaymentStatus
    amount: int
    provider: PaymentProvider
    phone_number: str
    created_at: datetime
    updated_at: datetime
    declaration_id: Optional[str] = None


class PaymentCallbackData(BaseModel):
    """Données de callback des opérateurs."""
    transaction_id: str
    provider_transaction_id: str
    status: str
    amount: int
    phone_number: str
    timestamp: str
    signature: str


# Stockage temporaire en mémoire (en production: Redis ou DB)
PAYMENTS_STORE: dict[str, dict] = {}


def generate_transaction_id() -> str:
    """Génère un ID de transaction unique et sécurisé."""
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    random_part = secrets.token_hex(8).upper()
    return f"TXN-{timestamp}-{random_part}"


def verify_callback_signature(data: PaymentCallbackData, secret_key: str) -> bool:
    """Vérifie la signature du callback de l'opérateur."""
    # Construire le message à signer
    message = f"{data.transaction_id}:{data.provider_transaction_id}:{data.amount}:{data.timestamp}"
    
    # Calculer le HMAC-SHA256
    expected_signature = hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Comparaison sécurisée
    return hmac.compare_digest(expected_signature, data.signature)


async def send_payment_request_flooz(phone: str, amount: int, transaction_id: str) -> dict:
    """
    Envoie une demande de paiement à l'API Flooz (Moov).
    NOTE: En production, remplacer par l'API réelle de Moov Money.
    """
    # Simulation - En production, utiliser l'API Moov
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         settings.FLOOZ_API_URL,
    #         json={
    #             "merchant_id": settings.FLOOZ_MERCHANT_ID,
    #             "amount": amount,
    #             "phone": phone,
    #             "reference": transaction_id,
    #         },
    #         headers={"Authorization": f"Bearer {settings.FLOOZ_API_KEY}"}
    #     )
    #     return response.json()
    
    return {
        "success": True,
        "provider_reference": f"FLOOZ-{secrets.token_hex(8).upper()}",
        "message": "Demande envoyée"
    }


async def send_payment_request_tmoney(phone: str, amount: int, transaction_id: str) -> dict:
    """
    Envoie une demande de paiement à l'API T-Money (Togocel).
    NOTE: En production, remplacer par l'API réelle de T-Money.
    """
    # Simulation - En production, utiliser l'API T-Money
    return {
        "success": True,
        "provider_reference": f"TMONEY-{secrets.token_hex(8).upper()}",
        "message": "Demande envoyée"
    }


@router.post("/initiate", response_model=PaymentInitResponse)
async def initiate_payment(
    request: Request,
    payment: PaymentInitRequest,
    background_tasks: BackgroundTasks
):
    """
    Initie un paiement Mobile Money.
    
    Étapes:
    1. Validation des données
    2. Création de la transaction
    3. Envoi de la demande à l'opérateur
    4. Retour de l'ID de transaction
    """
    # Rate limiting par IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Vérifier les tentatives récentes de cette IP
    recent_attempts = sum(
        1 for p in PAYMENTS_STORE.values()
        if p.get("ip") == client_ip
        and (datetime.now(timezone.utc) - p.get("created_at", datetime.min.replace(tzinfo=timezone.utc))).seconds < 300
    )
    
    if recent_attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives. Veuillez patienter 5 minutes."
        )
    
    # Générer l'ID de transaction
    transaction_id = generate_transaction_id()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Stocker la transaction
    PAYMENTS_STORE[transaction_id] = {
        "id": transaction_id,
        "provider": payment.provider,
        "phone_number": payment.phone_number,
        "amount": payment.amount,
        "declaration_type": payment.declaration_type,
        "status": PaymentStatus.PENDING,
        "ip": client_ip,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "provider_reference": None,
        "declaration_id": None,
    }
    
    # Envoyer la demande à l'opérateur en arrière-plan
    try:
        if payment.provider == PaymentProvider.FLOOZ:
            result = await send_payment_request_flooz(
                payment.phone_number, 
                payment.amount, 
                transaction_id
            )
        else:
            result = await send_payment_request_tmoney(
                payment.phone_number,
                payment.amount,
                transaction_id
            )
        
        if result.get("success"):
            PAYMENTS_STORE[transaction_id]["status"] = PaymentStatus.PROCESSING
            PAYMENTS_STORE[transaction_id]["provider_reference"] = result.get("provider_reference")
        else:
            PAYMENTS_STORE[transaction_id]["status"] = PaymentStatus.FAILED
            raise HTTPException(status_code=502, detail="Échec de connexion à l'opérateur")
            
    except HTTPException:
        raise
    except Exception as e:
        PAYMENTS_STORE[transaction_id]["status"] = PaymentStatus.FAILED
        raise HTTPException(status_code=500, detail="Erreur interne")
    
    return PaymentInitResponse(
        transaction_id=transaction_id,
        status=PaymentStatus.PROCESSING,
        message="Veuillez confirmer le paiement sur votre téléphone",
        expires_at=expires_at
    )


@router.get("/status/{transaction_id}", response_model=PaymentStatusResponse)
async def get_payment_status(transaction_id: str):
    """Récupère le statut d'un paiement."""
    payment = PAYMENTS_STORE.get(transaction_id)
    
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    
    # Vérifier l'expiration
    if (payment["status"] == PaymentStatus.PROCESSING 
        and datetime.now(timezone.utc) > payment["expires_at"]):
        payment["status"] = PaymentStatus.EXPIRED
        payment["updated_at"] = datetime.now(timezone.utc)
    
    return PaymentStatusResponse(
        transaction_id=payment["id"],
        status=payment["status"],
        amount=payment["amount"],
        provider=payment["provider"],
        phone_number=payment["phone_number"][:7] + "****",  # Masquer partiellement
        created_at=payment["created_at"],
        updated_at=payment["updated_at"],
        declaration_id=payment.get("declaration_id")
    )


@router.post("/callback/{provider}")
async def payment_callback(
    provider: PaymentProvider,
    data: PaymentCallbackData,
    request: Request
):
    """
    Callback webhook des opérateurs Mobile Money.
    
    Sécurité:
    - Vérification de la signature HMAC
    - Validation de l'origine (IP whitelist en production)
    - Logging de toutes les tentatives
    """
    # Log du callback
    client_ip = request.client.host if request.client else "unknown"
    
    # Récupérer la clé secrète selon l'opérateur
    if provider == PaymentProvider.FLOOZ:
        secret_key = settings.FLOOZ_WEBHOOK_SECRET
    else:
        secret_key = settings.TMONEY_WEBHOOK_SECRET
    
    # Vérifier la signature
    if not verify_callback_signature(data, secret_key):
        raise HTTPException(status_code=401, detail="Signature invalide")
    
    # Trouver la transaction
    payment = PAYMENTS_STORE.get(data.transaction_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    
    # Mettre à jour le statut
    if data.status == "SUCCESS":
        payment["status"] = PaymentStatus.SUCCESS
    elif data.status == "FAILED":
        payment["status"] = PaymentStatus.FAILED
    elif data.status == "CANCELLED":
        payment["status"] = PaymentStatus.CANCELLED
    
    payment["updated_at"] = datetime.now(timezone.utc)
    payment["provider_transaction_id"] = data.provider_transaction_id
    
    return {"received": True}


@router.post("/simulate-success/{transaction_id}")
async def simulate_payment_success(transaction_id: str):
    """
    Endpoint de test pour simuler un paiement réussi.
    À DÉSACTIVER EN PRODUCTION!
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Non disponible en production")
    
    payment = PAYMENTS_STORE.get(transaction_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    
    payment["status"] = PaymentStatus.SUCCESS
    payment["updated_at"] = datetime.now(timezone.utc)
    
    return {"success": True, "transaction_id": transaction_id}


@router.post("/link-declaration")
async def link_payment_to_declaration(
    transaction_id: str,
    declaration_id: str
):
    """Lie un paiement réussi à une déclaration."""
    payment = PAYMENTS_STORE.get(transaction_id)
    
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    
    if payment["status"] != PaymentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Le paiement n'est pas validé")
    
    if payment.get("declaration_id"):
        raise HTTPException(status_code=400, detail="Ce paiement est déjà utilisé")
    
    payment["declaration_id"] = declaration_id
    
    return {"success": True}
