# app/api/v1/endpoints/admin_support.py

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.schemas.support import SupportAdminOut, SupportStatus, SupportUpdate

router = APIRouter(prefix="/admin")


@router.get(
    "/support",
    response_model=List[SupportAdminOut],
)
def get_support_tickets_admin(
    status_filter: Optional[SupportStatus] = Query(
        default=None,
        description="Фильтр по статусу: open / in_progress / closed",
    ),
    user_id: Optional[int] = Query(
        default=None,
        description="Фильтр по пользователю",
    ),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Список тикетов поддержки для админа.
    Можно фильтровать по статусу и пользователю.
    """
    q = db.query(SupportTicket).join(User, SupportTicket.user_id == User.id)

    if status_filter is not None:
        q = q.filter(SupportTicket.status == status_filter)

    if user_id is not None:
        q = q.filter(SupportTicket.user_id == user_id)

    tickets = q.order_by(SupportTicket.created_at.desc()).all()

    return [_to_admin_out(t) for t in tickets]


@router.patch(
    "/support/{ticket_id}",
    response_model=SupportAdminOut,
)
def update_support_ticket_status(
    ticket_id: int,
    payload: SupportUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Изменить статус тикета поддержки:
    open / in_progress / closed
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")

    ticket.status = payload.status
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return _to_admin_out(ticket)


def _to_admin_out(ticket: SupportTicket) -> SupportAdminOut:
    u = ticket.user

    if u and u.last_name:
        name = f"{u.first_name} {u.last_name}"
    elif u:
        name = u.first_name
    else:
        name = "Неизвестный"

    return SupportAdminOut(
        id=ticket.id,
        user_id=ticket.user_id,
        topic=ticket.topic,
        message=ticket.message,
        status=ticket.status,  # type: ignore[arg-type]
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        user_name=name,
        user_phone=u.phone if u else None,
    )
