"""
Routes pour la gestion des fichiers (upload/download).
Gestion sécurisée des pièces jointes et photos de couverture.
"""
import os
import uuid
import hashlib
import magic
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter()

# Configuration
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Types MIME autorisés
ALLOWED_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class FileUploadResponse(BaseModel):
    """Réponse après upload."""
    file_id: str
    filename: str
    content_type: str
    size: int
    url: str


class FileMetadata(BaseModel):
    """Métadonnées d'un fichier."""
    file_id: str
    original_name: str
    content_type: str
    size: int
    uploaded_at: datetime
    checksum: str


def generate_secure_filename(original: str, content_type: str) -> str:
    """Génère un nom de fichier sécurisé."""
    ext = ALLOWED_TYPES.get(content_type, '.bin')
    unique_id = uuid.uuid4().hex
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d')
    return f"{timestamp}_{unique_id}{ext}"


def calculate_checksum(data: bytes) -> str:
    """Calcule le SHA-256 du fichier."""
    return hashlib.sha256(data).hexdigest()


def validate_file_content(data: bytes, claimed_type: str) -> bool:
    """
    Valide le contenu réel du fichier contre le type déclaré.
    Utilise libmagic pour détecter le vrai type MIME.
    """
    try:
        detected_type = magic.from_buffer(data, mime=True)
        return detected_type == claimed_type
    except Exception:
        return False


def scan_for_malware(data: bytes) -> bool:
    """
    Scanne le fichier pour détecter du contenu malveillant.
    NOTE: En production, utiliser ClamAV ou un service similaire.
    """
    # Vérifications basiques de sécurité
    
    # 1. Détecter les signatures de fichiers exécutables
    dangerous_signatures = [
        b'MZ',  # Windows EXE
        b'\x7fELF',  # Linux ELF
        b'PK\x03\x04',  # ZIP (peut contenir des malwares)
        b'Rar!',  # RAR
        b'%PDF-1',  # PDF - vérification supplémentaire
    ]
    
    # Pour les images, on accepte les signatures connues
    safe_signatures = [
        (b'\xff\xd8\xff', 'image/jpeg'),
        (b'\x89PNG\r\n\x1a\n', 'image/png'),
        (b'RIFF', 'image/webp'),
    ]
    
    # Vérifier si c'est un format sûr connu
    for sig, _ in safe_signatures:
        if data.startswith(sig):
            return True
    
    # Pour les PDF, vérification plus stricte
    if data.startswith(b'%PDF'):
        # Vérifier les éléments dangereux dans les PDF
        dangerous_pdf_elements = [
            b'/JavaScript',
            b'/JS',
            b'/OpenAction',
            b'/Launch',
            b'/EmbeddedFile',
        ]
        for element in dangerous_pdf_elements:
            if element in data:
                return False
        return True
    
    # Rejeter les autres types
    return False


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Upload sécurisé d'un fichier.
    
    Validations:
    - Type MIME autorisé
    - Taille maximale
    - Contenu réel vs type déclaré
    - Scan de sécurité basique
    """
    # Vérifier le type MIME déclaré
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorisé: {file.content_type}"
        )
    
    # Lire le fichier
    data = await file.read()
    
    # Vérifier la taille
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Maximum: {MAX_FILE_SIZE // (1024*1024)} Mo"
        )
    
    # Valider le contenu réel
    if not validate_file_content(data, file.content_type):
        raise HTTPException(
            status_code=400,
            detail="Le contenu du fichier ne correspond pas au type déclaré"
        )
    
    # Scan de sécurité
    if not scan_for_malware(data):
        raise HTTPException(
            status_code=400,
            detail="Fichier rejeté pour raisons de sécurité"
        )
    
    # Générer le nom sécurisé
    secure_name = generate_secure_filename(file.filename or "file", file.content_type)
    file_path = UPLOAD_DIR / secure_name
    
    # Calculer le checksum
    checksum = calculate_checksum(data)
    
    # Sauvegarder le fichier
    with open(file_path, 'wb') as f:
        f.write(data)
    
    # Créer l'ID du fichier (basé sur le checksum pour déduplication)
    file_id = checksum[:16]
    
    return FileUploadResponse(
        file_id=file_id,
        filename=secure_name,
        content_type=file.content_type,
        size=len(data),
        url=f"/api/v1/files/{secure_name}"
    )


@router.get("/{filename}")
async def get_file(filename: str):
    """
    Récupère un fichier uploadé.
    
    Sécurité:
    - Validation du nom de fichier
    - Pas de traversée de répertoire
    """
    # Nettoyer le nom de fichier
    safe_name = os.path.basename(filename)
    
    # Vérifier l'extension
    ext = Path(safe_name).suffix.lower()
    if ext not in ['.jpg', '.png', '.webp', '.pdf']:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    file_path = UPLOAD_DIR / safe_name
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    
    # Déterminer le type MIME
    content_types = {
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
    }
    
    return FileResponse(
        file_path,
        media_type=content_types.get(ext, 'application/octet-stream'),
        headers={
            'Cache-Control': 'public, max-age=31536000',  # 1 an
            'X-Content-Type-Options': 'nosniff',
        }
    )


@router.delete("/{filename}")
async def delete_file(
    filename: str,
    current_user = Depends(get_current_user)
):
    """
    Supprime un fichier (admin uniquement).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    safe_name = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_name
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    
    os.remove(file_path)
    
    return {"deleted": True, "filename": safe_name}
