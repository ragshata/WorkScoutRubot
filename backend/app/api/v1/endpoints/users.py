# app/api/v1/endpoints/users.py

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.review import Review
from app.models.order import Order
from app.schemas.user import UserOut, UpdateUserPayload
from app.utils import str_to_list, list_to_str

router = APIRouter(prefix="/users")


@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return _build_user_out(current, db)


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UpdateUserPayload,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    data = payload.dict(exclude_unset=True)

    if "first_name" in data and data["first_name"]:
        current.first_name = data["first_name"]

    if "last_name" in data:
        current.last_name = data["last_name"]

    if "phone" in data:
        current.phone = data["phone"]

    if "city" in data:
        current.city = data["city"]

    if "about" in data:
        current.about = data["about"]

    if "specializations" in data:
        current.specializations_raw = list_to_str(data["specializations"])

    if "company_name" in data:
        current.company_name = data["company_name"]

    if "about_orders" in data:
        current.about_orders = data["about_orders"]

    db.add(current)
    db.commit()
    db.refresh(current)

    return _build_user_out(current, db)


@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Профиль любого пользователя по id (для карточек исполнителей и т.п.).
    Доступен любому залогиненному пользователю.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    return _build_user_out(user, db)


# =========================
# ХЕЛПЕРЫ
# =========================
def _build_user_out(user: User, db: Session) -> UserOut:
    """
    Собираем DTO профиля с рейтингом, количеством завершённых заказов
    и инфой по отзывам.

    rating:
        среднее по Review.rating, где target_user_id = user.id и status='approved'
    reviews_count:
        количество таких отзывов
    orders_count:
        количество заказов со статусом 'done', где user участвовал
        как заказчик или как исполнитель.
    """
    # рейтинг + количество отзывов
    rating_row = (
        db.query(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("cnt"),
        )
        .filter(
            Review.target_user_id == user.id,
            Review.status == "approved",
        )
        .first()
    )

    rating_value: Optional[float] = None
    reviews_count: int = 0

    if rating_row is not None:
        if rating_row.avg_rating is not None:
            rating_value = round(float(rating_row.avg_rating), 1)
        reviews_count = rating_row.cnt or 0

    has_reviews = reviews_count > 0

    # количество завершённых заказов
    orders_count: int = (
        db.query(func.count(Order.id))
        .filter(
            Order.status == "done",
            or_(
                Order.customer_id == user.id,
                Order.executor_id == user.id,
            ),
        )
        .scalar()
        or 0
    )

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
        rating=rating_value,
        orders_count=orders_count,
        reviews_count=reviews_count,
        has_reviews=has_reviews,
    )

