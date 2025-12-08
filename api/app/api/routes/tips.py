"""
Routes pour les indices/signalements.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.security import sanitize_input
from app.models.declaration import Declaration, DeclarationStatus, DeclarationType
from app.models.tip import Tip
from app.models.activity_log import ActivityLog, ActivityAction
from app.models.user import User
from app.schemas.tip import (
    TipCreate,
    TipPublicResponse,
    TipAdminResponse,
    TipUpdate,
    TipListResponse,
)
from app.api.deps import require_moderator_or_admin, get_client_info

router = APIRouter(prefix="/tips", tags=["Indices"])


@router.post("/", response_model=TipPublicResponse, status_code=status.HTTP_201_CREATED)
async def create_tip(
    tip_data: TipCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Soumet un indice pour une déclaration (public).
    """
    client_info = get_client_info(request)
    
    # Vérifier que la déclaration existe et est publique
    result = await db.execute(
        select(Declaration).where(Declaration.id == tip_data.declaration_id)
    )
    declaration = result.scalar_one_or_none()
    
    if not declaration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Déclaration non trouvée"
        )
    
    # Vérifier que la déclaration est validée et de type perte
    if declaration.status != DeclarationStatus.VALIDEE or declaration.type != DeclarationType.PERTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de soumettre un indice pour cette déclaration"
        )
    
    # Préparer les pièces jointes
    attachments = []
    if tip_data.attachments:
        for att in tip_data.attachments[:3]:  # Max 3 fichiers
            attachments.append({
                "filename": sanitize_input(att.filename, 255),
                "content_type": att.content_type,
                "size": att.size,
                "data": att.data,
            })
    
    # Créer l'indice
    tip = Tip(
        declaration_id=tip_data.declaration_id,
        tipster_phone=tip_data.tipster_phone,
        description=sanitize_input(tip_data.description, 2000),
        attachments=attachments,
        metadata={
            "ip_address": client_info["ip_address"],
            "user_agent": client_info["user_agent"],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    
    db.add(tip)
    
    # Logger l'action
    log = ActivityLog(
        action=ActivityAction.TIP_SUBMITTED,
        target_type="tip",
        target_id=tip.id,
        details={
            "declaration_id": tip_data.declaration_id,
            "tracking_code": declaration.tracking_code,
        },
        **client_info
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(tip)
    
    return TipPublicResponse(
        id=tip.id,
        declaration_id=tip.declaration_id,
        created_at=tip.created_at,
    )


# === Routes Admin ===

@router.get("/admin", response_model=TipListResponse)
async def list_tips(
    declaration_id: Optional[str] = None,
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Liste les indices (admin).
    """
    base_query = select(Tip)
    
    # Filtres
    filters = []
    if declaration_id:
        filters.append(Tip.declaration_id == declaration_id)
    if unread_only:
        filters.append(Tip.is_read == 0)
    
    if filters:
        base_query = base_query.where(and_(*filters))
    
    # Compter total et non lus
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    unread_query = select(func.count()).where(Tip.is_read == 0)
    if declaration_id:
        unread_query = unread_query.where(Tip.declaration_id == declaration_id)
    unread_result = await db.execute(unread_query)
    unread_count = unread_result.scalar()
    
    # Pagination
    offset = (page - 1) * per_page
    query = base_query.order_by(Tip.created_at.desc()).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    tips = result.scalars().all()
    
    items = [TipAdminResponse(
        id=t.id,
        declaration_id=t.declaration_id,
        tipster_phone=t.tipster_phone,
        description=t.description,
        attachments=t.attachments,
        is_read=bool(t.is_read),
        is_useful=bool(t.is_useful) if t.is_useful is not None else None,
        admin_notes=t.admin_notes,
        metadata=t.metadata,
        created_at=t.created_at,
        reviewed_at=t.reviewed_at,
        reviewed_by=t.reviewed_by,
    ) for t in tips]
    
    return TipListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
    )


@router.get("/admin/{tip_id}", response_model=TipAdminResponse)
async def get_tip(
    tip_id: str,
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Détails d'un indice (admin).
    """
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    
    if not tip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indice non trouvé"
        )
    
    return TipAdminResponse(
        id=tip.id,
        declaration_id=tip.declaration_id,
        tipster_phone=tip.tipster_phone,
        description=tip.description,
        attachments=tip.attachments,
        is_read=bool(tip.is_read),
        is_useful=bool(tip.is_useful) if tip.is_useful is not None else None,
        admin_notes=tip.admin_notes,
        metadata=tip.metadata,
        created_at=tip.created_at,
        reviewed_at=tip.reviewed_at,
        reviewed_by=tip.reviewed_by,
    )


@router.patch("/admin/{tip_id}", response_model=TipAdminResponse)
async def update_tip(
    tip_id: str,
    update_data: TipUpdate,
    request: Request,
    current_user: User = Depends(require_moderator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour un indice (admin).
    """
    client_info = get_client_info(request)
    
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    
    if not tip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indice non trouvé"
        )
    
    # Marquer comme lu
    if update_data.is_read is not None:
        tip.is_read = 1 if update_data.is_read else 0
        
        if update_data.is_read:
            log = ActivityLog(
                action=ActivityAction.TIP_READ,
                user_id=current_user.id,
                username=current_user.username,
                target_type="tip",
                target_id=tip_id,
                **client_info
            )
            db.add(log)
    
    # Évaluer l'utilité
    if update_data.is_useful is not None:
        tip.is_useful = 1 if update_data.is_useful else 0
        tip.reviewed_at = datetime.now(timezone.utc)
        tip.reviewed_by = current_user.id
        
        log = ActivityLog(
            action=ActivityAction.TIP_EVALUATED,
            user_id=current_user.id,
            username=current_user.username,
            target_type="tip",
            target_id=tip_id,
            details={"is_useful": update_data.is_useful},
            **client_info
        )
        db.add(log)
    
    # Notes admin
    if update_data.admin_notes is not None:
        tip.admin_notes = sanitize_input(update_data.admin_notes, 1000)
    
    await db.commit()
    await db.refresh(tip)
    
    return await get_tip(tip_id, current_user, db)
