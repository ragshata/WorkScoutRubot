# app/models/review.py

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)

    rating = Column(Integer, nullable=False)  # 1–5
    text = Column(Text, nullable=False)

    # pending | approved | hidden
    status = Column(String, nullable=False, default="pending")

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    author = relationship("User", foreign_keys=[author_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    order = relationship("Order")
