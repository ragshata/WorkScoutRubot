# app/api/v1/endpoints/admin_reviews.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewModerate, ReviewOut
from app.api.v1.endpoints.reviews import _review_to_out

router = APIRouter(prefix="/admin")


@router.patch(
    "/reviews/{review_id}",
    response_model=ReviewOut,
)
def moderate_review(
    review_id: int,
    payload: ReviewModerate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Изменить статус отзыва: pending / approved / hidden.
    Только для админа.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Отзыв не найден")

    review.status = payload.status  # pydantic уже гарантирует допустимые значения
    db.add(review)
    db.commit()
    db.refresh(review)

    return _review_to_out(review)
