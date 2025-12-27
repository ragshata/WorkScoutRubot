# app/models/order.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    # заказчик
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # выбранный исполнитель (может быть None, пока не выбрали)
    executor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    address = Column(String, nullable=True)

    # В БД колонка называется "categories", но в коде используем categories_raw
    categories_raw = Column("categories", String, nullable=True)

    budget_type = Column(String, nullable=False)  # fixed | negotiable
    budget_amount = Column(Integer, nullable=True)

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    photos_raw = Column("photos", String, nullable=True)

    # active | in_progress | done | cancelled и т.п.
    status = Column(String, nullable=False, default="active")
    has_photos = Column(Boolean, nullable=False, default=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ====== RELATIONSHIPS ======

    customer = relationship(
        "User",
        back_populates="customer_orders",
        foreign_keys=[customer_id],
    )
    executor = relationship(
        "User",
        back_populates="executor_orders",
        foreign_keys=[executor_id],
    )

    responses = relationship("Response", back_populates="order")
    chat = relationship("Chat", back_populates="order", uselist=False)
    reviews = relationship("Review", back_populates="order")
