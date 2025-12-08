"""
Routes pour les déclarations.
Gestion publique et admin des déclarations.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.core.database import get_db
from app.core.security import generate_tracking_code, sanitize_input
from app.models.declaration import Declaration, DeclarationType, DeclarationStatus, DeclarationPriority
from app.models.tip import Tip
from app.models.activity_log import ActivityLog, ActivityAction
from app.models.user import User
from app.schemas.declaration import (
    DeclarationCreate,
    DeclarationUpdate,
    DeclarationPublicResponse,
    DeclarationAdminResponse,
    DeclarationTrackResponse,
    DeclarationListResponse,
)
from app.api.deps import get_current_user, require_moderator_or_admin, get_client_info

router = APIRouter(prefix="/declarations", tags=["Déclarations"])


@router.post("/", response_model=DeclarationTrackResponse, status_code=status.HTTP_201_CREATED)
async def create_declaration(
    declaration_data: DeclarationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une nouvelle déclaration (public).
    Retourne le code de suivi.
    """
    client_info = get_client_info(request)
    
    # Générer un code de suivi unique
    tracking_code = generate_tracking_code()
    
    # Vérifier l'unicité du code
    while True:
        result = await db.execute(
            select(Declaration).where(Declaration.tracking_code == tracking_code)
        )
        if not result.scalar_one_or_none():
            break
        tracking_code = generate_tracking_code()
    
    # Préparer les pièces jointes
    attachments = []
    if declaration_data.attachments:
        for att in declaration_data.attachments[:5]:  # Max 5 fichiers
            attachments.append({
                "filename": sanitize_input(att.filename, 255),
                "content_type": att.content_type,
                "size": att.size,
                "data": att.data,  # Base64
            })
    
    # Créer la déclaration
    declaration = Declaration(
        tracking_code=tracking_code,
        type=declaration_data.type,
        category=sanitize_input(declaration_data.category, 100),
        description=sanitize_input(declaration_data.description, 5000),
        incident_date=declaration_data.incident_date,
        location=sanitize_input(declaration_data.location, 500) if declaration_data.location else None,
        reward=sanitize_input(declaration_data.reward, 100) if declaration_data.reward else None,
        declarant_name=sanitize_input(declaration_data.declarant_name, 255) if declaration_data.declarant_name else None,
        declarant_phone=declaration_data.declarant_phone,
        declarant_email=declaration_data.declarant_email.lower() if declaration_data.declarant_email else None,
        attachments=attachments,
        metadata={
            "ip_address": client_info["ip_address"],
            "user_agent": client_info["user_agent"],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
        status_history=[{
            "status": DeclarationStatus.EN_ATTENTE.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "comment": "Déclaration soumise",
        }],
    )
    
    db.add(declaration)
    
    # Logger l'action
    log = ActivityLog(
        action=ActivityAction.DECLARATION_CREATED,
        target_type="declaration",
        target_id=declaration.id,
        details={
            "tracking_code": tracking_code,
            "type": declaration_data.type.value,
            "category": declaration_data.category,
        },
        **client_info
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(declaration)
    
    return DeclarationTrackResponse(
        tracking_code=declaration.tracking_code,
        type=declaration.type,
        category=declaration.category,
        status=declaration.status,
        priority=declaration.priority,
        created_at=declaration.created_at,
        last_update=declaration.updated_at,
        status_history=[{
            "status": h["status"],
            "timestamp": h["timestamp"],
        } for h in declaration.status_history],
    )


@router.get("/track/{tracking_code}", response_model=DeclarationTrackResponse)
async def track_declaration(
    tracking_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Suivi d'une déclaration par son code (public).
    Ne retourne que les informations non sensibles.
    """
    result = await db.execute(
        select(Declaration).where(Declaration.tracking_code == tracking_code.upper())
    )
    declaration = result.scalar_one_or_none()
    
    if not declaration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Déclaration non trouvée"
        )
    
    # Filtrer l'historique pour ne pas exposer les commentaires admin
    safe_history = [{
        "status": h["status"],
        "timestamp": h["timestamp"],
    } for h in declaration.status_history]
    
    return DeclarationTrackResponse(
        tracking_code=declaration.tracking_code,
        type=declaration.type,
        category=declaration.category,
        status=declaration.status,
        priority=declaration.priority,
        created_at=declaration.created_at,
        last_update=declaration.updated_at,
        status_history=safe_history,
    )


@router.get("/public", response_model=DeclarationListResponse)
async def list_public_declarations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[DeclarationType] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Liste les déclarations publiques (validées, type perte uniquement).
    Les données sensibles sont masquées.
    """
    # Construire la requête de base
    base_query = select(Declaration).where(
        and_(
            Declaration.status == DeclarationStatus.VALIDEE,
            Declaration.type == DeclarationType.PERTE,
        )
    )
    
    if type:
        base_query = base_query.where(Declaration.type == type)
    
    # Compter le total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    offset = (page - 1) * per_page
    query = base_query.order_by(
        Declaration.priority.desc(),
        Declaration.created_at.desc()
    ).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    declarations = result.scalars().all()
    
    # Construire la réponse avec données anonymisées
    items = []
    for decl in declarations:
        # Anonymiser la localisation
        location = decl.location
        if location and len(location) > 50:
            location = location[:50] + "..."
        
        items.append(DeclarationPublicResponse(
            id=decl.id,
            tracking_code=decl.tracking_code,
            type=decl.type,
            category=decl.category,
            description=decl.description,
            incident_date=decl.incident_date,
            location=location,
            reward=decl.reward,
            status=decl.status,
            priority=decl.priority,
            created_at=decl.created_at,
        ))
    
    pages = (total + per_page - 1) // per_page
    
    return DeclarationListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


# === Routes Admin ===

@router.get("/admin", response_model=DeclarationListResponse)
async def list_all_declarations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[DeclarationStatus] = None,
    type: Optional[DeclarationType] = None,
    priority: Optional[DeclarationPriority] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Liste toutes les déclarations (admin).
    """
    base_query = select(Declaration)
    
    # Filtres
    filters = []
    if status:
        filters.append(Declaration.status == status)
    if type:
        filters.append(Declaration.type == type)
    if priority:
        filters.append(Declaration.priority == priority)
    if search:
        search_term = f"%{search}%"
        filters.append(or_(
            Declaration.tracking_code.ilike(search_term),
            Declaration.description.ilike(search_term),
            Declaration.category.ilike(search_term),
            Declaration.declarant_name.ilike(search_term),
        ))
    
    if filters:
        base_query = base_query.where(and_(*filters))
    
    # Compter
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    offset = (page - 1) * per_page
    query = base_query.order_by(
        Declaration.created_at.desc()
    ).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    declarations = result.scalars().all()
    
    items = [DeclarationPublicResponse(
        id=d.id,
        tracking_code=d.tracking_code,
        type=d.type,
        category=d.category,
        description=d.description,
        incident_date=d.incident_date,
        location=d.location,
        reward=d.reward,
        status=d.status,
        priority=d.priority,
        created_at=d.created_at,
    ) for d in declarations]
    
    pages = (total + per_page - 1) // per_page
    
    return DeclarationListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/admin/{declaration_id}", response_model=DeclarationAdminResponse)
async def get_declaration_admin(
    declaration_id: str,
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Détails complets d'une déclaration (admin).
    """
    result = await db.execute(
        select(Declaration).where(Declaration.id == declaration_id)
    )
    declaration = result.scalar_one_or_none()
    
    if not declaration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Déclaration non trouvée"
        )
    
    # Compter les tips
    tips_result = await db.execute(
        select(func.count()).where(Tip.declaration_id == declaration_id)
    )
    tips_count = tips_result.scalar()
    
    unread_tips_result = await db.execute(
        select(func.count()).where(
            and_(Tip.declaration_id == declaration_id, Tip.is_read == 0)
        )
    )
    unread_tips_count = unread_tips_result.scalar()
    
    return DeclarationAdminResponse(
        id=declaration.id,
        tracking_code=declaration.tracking_code,
        type=declaration.type,
        category=declaration.category,
        description=declaration.description,
        incident_date=declaration.incident_date,
        location=declaration.location,
        reward=declaration.reward,
        status=declaration.status,
        priority=declaration.priority,
        created_at=declaration.created_at,
        declarant_name=declaration.declarant_name,
        declarant_phone=declaration.declarant_phone,
        declarant_email=declaration.declarant_email,
        admin_notes=declaration.admin_notes,
        metadata=declaration.metadata,
        status_history=declaration.status_history,
        attachments=declaration.attachments,
        updated_at=declaration.updated_at,
        tips_count=tips_count,
        unread_tips_count=unread_tips_count,
        messages_count=0,
        unread_messages_count=0,
    )


@router.patch("/admin/{declaration_id}", response_model=DeclarationAdminResponse)
async def update_declaration(
    declaration_id: str,
    update_data: DeclarationUpdate,
    request: Request,
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour une déclaration (admin).
    """
    client_info = get_client_info(request)
    
    result = await db.execute(
        select(Declaration).where(Declaration.id == declaration_id)
    )
    declaration = result.scalar_one_or_none()
    
    if not declaration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Déclaration non trouvée"
        )
    
    changes = {}
    
    # Mise à jour du statut
    if update_data.status and update_data.status != declaration.status:
        old_status = declaration.status
        declaration.status = update_data.status
        
        # Ajouter à l'historique
        history_entry = {
            "status": update_data.status.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "changed_by": current_user.username,
            "comment": update_data.status_comment or "",
        }
        declaration.status_history = declaration.status_history + [history_entry]
        
        changes["status"] = {"old": old_status.value, "new": update_data.status.value}
        
        # Logger
        action = ActivityAction.DECLARATION_STATUS_CHANGED
        if update_data.status == DeclarationStatus.VALIDEE:
            action = ActivityAction.DECLARATION_VALIDATED
        elif update_data.status == DeclarationStatus.REJETEE:
            action = ActivityAction.DECLARATION_REJECTED
        
        log = ActivityLog(
            action=action,
            user_id=current_user.id,
            username=current_user.username,
            target_type="declaration",
            target_id=declaration_id,
            details=changes,
            **client_info
        )
        db.add(log)
    
    # Mise à jour de la priorité
    if update_data.priority and update_data.priority != declaration.priority:
        old_priority = declaration.priority
        declaration.priority = update_data.priority
        changes["priority"] = {"old": old_priority.value, "new": update_data.priority.value}
        
        log = ActivityLog(
            action=ActivityAction.DECLARATION_PRIORITY_CHANGED,
            user_id=current_user.id,
            username=current_user.username,
            target_type="declaration",
            target_id=declaration_id,
            details=changes,
            **client_info
        )
        db.add(log)
    
    # Mise à jour des notes admin
    if update_data.admin_notes is not None:
        declaration.admin_notes = sanitize_input(update_data.admin_notes, 2000)
    
    declaration.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(declaration)
    
    return await get_declaration_admin(declaration_id, current_user, db)
