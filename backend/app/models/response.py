# app/models/response.py

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    executor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    price = Column(Integer, nullable=True)
    comment = Column(Text, nullable=False)

    # waiting | chosen | declined | done
    status = Column(String, nullable=False, default="waiting")

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    order = relationship("Order", back_populates="responses")
    executor = relationship("User", back_populates="responses")
