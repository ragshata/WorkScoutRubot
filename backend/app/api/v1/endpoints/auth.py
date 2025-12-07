# app/api/v1/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import User
from app.schemas.user import RegisterPayload, UserOut
from app.utils import list_to_str  # сделаем утилку ниже

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=UserOut)
def register_user(payload: RegisterPayload, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким Telegram ID уже существует",
        )

    user = User(
        telegram_id=payload.telegram_id,
        role=payload.role,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        city=payload.city,
        experience_years=payload.experience_years,
        specializations_raw=list_to_str(payload.specializations),
        portfolio_photos_raw=list_to_str(payload.portfolio_photos),
        about=payload.about,
        company_name=payload.company_name,
        about_orders=payload.about_orders,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _user_to_out(user)


def _user_to_out(user: User) -> UserOut:
    from app.utils import str_to_list

    return UserOut(
        id=user.id,
        role=user.role,  # type: ignore[arg-type]
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        city=user.city,
        about=user.about,
        specializations=str_to_list(user.specializations_raw),
        company_name=user.company_name,
        about_orders=user.about_orders,
        rating=None,
        orders_count=None,
    )
