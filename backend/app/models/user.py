# app/models/user.py

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)

    role = Column(String, nullable=False)  # customer | executor | admin

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)

    experience_years = Column(Integer, nullable=True)

    specializations_raw = Column("specializations", String, nullable=True)
    portfolio_photos_raw = Column("portfolio_photos", String, nullable=True)

    about = Column(Text, nullable=True)
    company_name = Column(String, nullable=True)
    about_orders = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    is_blocked = Column(Boolean, nullable=False, default=False)

    # ====== RELATIONSHIPS ======

    # Заказы, где пользователь — заказчик
    customer_orders = relationship(
        "Order",
        back_populates="customer",
        foreign_keys="Order.customer_id",
    )

    # Заказы, где пользователь — исполнитель
    executor_orders = relationship(
        "Order",
        back_populates="executor",
        foreign_keys="Order.executor_id",
    )

    # Отклики, где пользователь выступает как исполнитель
    responses = relationship("Response", back_populates="executor")

    # Чаты (если у тебя так в модели Chat)
    chats_as_customer = relationship(
        "Chat",
        back_populates="customer",
        foreign_keys="Chat.customer_id",
    )
    chats_as_executor = relationship(
        "Chat",
        back_populates="executor",
        foreign_keys="Chat.executor_id",
    )

    # Отзывы (если у тебя есть модель Review как мы делали раньше)
    reviews_written = relationship(
        "Review",
        back_populates="author",
        foreign_keys="Review.author_id",
    )
    reviews_received = relationship(
        "Review",
        back_populates="target_user",
        foreign_keys="Review.target_user_id",
    )

    # Тикеты в поддержку
    support_tickets = relationship("SupportTicket", back_populates="user")
