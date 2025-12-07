# app/schemas/review.py

from datetime import datetime
from typing import Literal, List, Optional

from pydantic import BaseModel, Field


ReviewStatus = Literal["pending", "approved", "hidden"]


class ReviewCreate(BaseModel):
    order_id: int
    target_user_id: int
    rating: int = Field(..., ge=1, le=5)
    text: str


class ReviewOut(BaseModel):
    id: int
    order_id: int
    author_id: int
    target_user_id: int
    rating: int
    text: str
    status: ReviewStatus
    created_at: datetime

    author_name: str
    order_title: str

    class Config:
        orm_mode = True


class ReviewModerate(BaseModel):
    status: ReviewStatus


class UserReviewsSummary(BaseModel):
    user_id: int
    rating: Optional[float]
    reviews_count: int
    reviews: List[ReviewOut]