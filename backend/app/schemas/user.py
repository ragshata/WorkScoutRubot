# app/schemas/user.py
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel


UserRole = Literal["customer", "executor", "admin"]


class RegisterPayload(BaseModel):
    telegram_id: int
    role: UserRole
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    experience_years: Optional[int] = None
    specializations: Optional[List[str]] = None
    portfolio_photos: Optional[List[str]] = None
    about: Optional[str] = None
    about_orders: Optional[str] = None
    company_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    role: UserRole
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    about: Optional[str] = None
    specializations: Optional[List[str]] = None
    company_name: Optional[str] = None
    about_orders: Optional[str] = None

    # то, что уже было
    rating: Optional[float] = None
    orders_count: Optional[int] = None

    # НОВОЕ
    reviews_count: int = 0
    has_reviews: bool = False

    class Config:
        orm_mode = True


class UpdateUserPayload(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    about: Optional[str] = None
    specializations: Optional[List[str]] = None
    company_name: Optional[str] = None
    about_orders: Optional[str] = None

    class Config:
        extra = "ignore"


class AdminUserOut(BaseModel):
    id: int
    role: UserRole
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_blocked: bool
    created_at: datetime

    class Config:
        orm_mode = True
