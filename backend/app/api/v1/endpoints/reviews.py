# app/api/v1/endpoints/reviews.py

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.order import Order
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut, UserReviewsSummary

router = APIRouter(prefix="/reviews")


@router.post(
    "/",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Создать отзыв по заказу.
    Правила:
    - заказ должен существовать и быть в статусе done
    - текущий пользователь должен быть заказчиком или исполнителем
    - target_user_id должен быть второй стороной сделки
    - один отзыв на (order + author + target)
    """
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status != "done":
        raise HTTPException(
            status_code=400,
            detail="Отзыв можно оставить только по завершённому заказу",
        )

    if current.id not in (order.customer_id, order.executor_id):
        raise HTTPException(
            status_code=403,
            detail="Вы не участвовали в этом заказе",
        )

    # target — это второй участник сделки
    other_id = order.executor_id if current.id == order.customer_id else order.customer_id
    if other_id != payload.target_user_id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя оставлять отзыв не по своему собеседнику по заказу",
        )

    # один отзыв на пару (author, target, order)
    existing = (
        db.query(Review)
        .filter(
            Review.order_id == order.id,
            Review.author_id == current.id,
            Review.target_user_id == payload.target_user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Вы уже оставили отзыв по этому заказу",
        )

    text = (payload.text or "").strip()
    if len(text) < 3:
        raise HTTPException(
            status_code=400,
            detail="Текст отзыва слишком короткий",
        )

    if not (1 <= payload.rating <= 5):
        raise HTTPException(
            status_code=400,
            detail="Рейтинг должен быть от 1 до 5",
        )

    review = Review(
        order_id=order.id,
        author_id=current.id,
        target_user_id=payload.target_user_id,
        rating=payload.rating,
        text=text,
        # сейчас пусть будут сразу видны, пока нет админки
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return _review_to_out(review)


@router.get(
    "/for-user/{user_id}",
    response_model=UserReviewsSummary,
)
def get_reviews_for_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Отзывы по пользователю (как исполнителю/заказчику) + его общий рейтинг.

    rating:
      среднее по Review.rating, где target_user_id = user_id и status='approved'
    reviews_count:
      количество таких отзывов
    reviews:
      сами отзывы (кроме hidden)
    """
    # сами отзывы (все, кроме hidden)
    reviews = (
        db.query(Review)
        .join(Order, Review.order_id == Order.id)
        .join(User, Review.author_id == User.id)
        .filter(
            Review.target_user_id == user_id,
            Review.status != "hidden",
        )
        .order_by(Review.created_at.desc())
        .all()
    )

    # рейтинг считаем только по approved
    rating_row = (
        db.query(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("cnt"),
        )
        .filter(
            Review.target_user_id == user_id,
            Review.status == "approved",
        )
        .first()
    )

    avg_rating: Optional[float] = None
    reviews_count: int = 0

    if rating_row is not None:
        if rating_row.avg_rating is not None:
            avg_rating = round(float(rating_row.avg_rating), 1)
        reviews_count = rating_row.cnt or 0

    return UserReviewsSummary(
        user_id=user_id,
        rating=avg_rating,
        reviews_count=reviews_count,
        reviews=[_review_to_out(r) for r in reviews],
    )



def _review_to_out(review: Review) -> ReviewOut:
    author = review.author
    order = review.order

    if author and author.last_name:
        author_name = f"{author.first_name} {author.last_name}"
    elif author:
        author_name = author.first_name
    else:
        author_name = "Неизвестный"

    order_title = order.title if order else ""

    return ReviewOut(
        id=review.id,
        order_id=review.order_id,
        author_id=review.author_id,
        target_user_id=review.target_user_id,
        rating=review.rating,
        text=review.text,
        status=review.status,  # type: ignore[arg-type]
        created_at=review.created_at,
        author_name=author_name,
        order_title=order_title,
    )
