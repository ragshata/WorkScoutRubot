# app/api/v1/endpoints/support.py

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.schemas.support import SupportCreate, SupportOut

router = APIRouter(prefix="/support")


@router.post(
    "/",
    response_model=SupportOut,
    status_code=status.HTTP_201_CREATED,
)
def create_support_ticket(
    payload: SupportCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    topic = (payload.topic or "").strip()
    message = (payload.message or "").strip()

    if len(topic) < 3:
        raise HTTPException(
            status_code=400,
            detail="Тема обращения слишком короткая",
        )
    if len(message) < 5:
        raise HTTPException(
            status_code=400,
            detail="Текст обращения слишком короткий",
        )

    ticket = SupportTicket(
        user_id=current.id,
        topic=topic,
        message=message,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return _to_out(ticket)


@router.get(
    "/my",
    response_model=List[SupportOut],
)
def get_my_support_tickets(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [_to_out(t) for t in tickets]


def _to_out(ticket: SupportTicket) -> SupportOut:
    return SupportOut(
        id=ticket.id,
        user_id=ticket.user_id,
        topic=ticket.topic,
        message=ticket.message,
        status=ticket.status,  # type: ignore[arg-type]
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )
