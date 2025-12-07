# app/api/v1/endpoints/admin_users.py

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User
from app.schemas.user import AdminUserOut, UserRole

router = APIRouter(prefix="/admin")


@router.get(
    "/users",
    response_model=List[AdminUserOut],
)
def list_users_admin(
    role: Optional[UserRole] = Query(
        default=None,
        description="Фильтр по роли: customer / executor / admin",
    ),
    city: Optional[str] = Query(
        default=None,
        description="Фильтр по городу",
    ),
    is_blocked: Optional[bool] = Query(
        default=None,
        description="Фильтр по флагу блокировки",
    ),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Список пользователей для админа с простыми фильтрами.
    """
    q = db.query(User)

    if role is not None:
        q = q.filter(User.role == role)

    if city is not None:
        q = q.filter(User.city == city)

    if is_blocked is not None:
        q = q.filter(User.is_blocked == is_blocked)

    users = q.order_by(User.created_at.desc()).all()

    return [_to_admin_user_out(u) for u in users]


@router.patch(
    "/users/{user_id}/block",
    response_model=AdminUserOut,
)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Заблокировать пользователя (запретить ходить в API).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == current.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя заблокировать самого себя",
        )

    user.is_blocked = True
    db.add(user)
    db.commit()
    db.refresh(user)

    return _to_admin_user_out(user)


@router.patch(
    "/users/{user_id}/unblock",
    response_model=AdminUserOut,
)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Разблокировать пользователя.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_blocked = False
    db.add(user)
    db.commit()
    db.refresh(user)

    return _to_admin_user_out(user)


def _to_admin_user_out(user: User) -> AdminUserOut:
    return AdminUserOut(
        id=user.id,
        role=user.role,  # type: ignore[arg-type]
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        city=user.city,
        is_blocked=user.is_blocked,
        created_at=user.created_at,
    )
