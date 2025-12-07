# app/schemas/order.py

from datetime import date, datetime
from typing import List, Optional, Literal

from pydantic import BaseModel


BudgetType = Literal["fixed", "negotiable"]
OrderStatus = Literal["active", "in_progress", "done", "cancelled"]


class OrderCreate(BaseModel):
    title: str
    description: str
    city: str
    address: Optional[str] = None
    categories: List[str]
    budget_type: BudgetType
    budget_amount: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class OrderOut(BaseModel):
    id: int
    title: str
    description: str
    city: str
    address: Optional[str]
    categories: List[str]
    budget_type: BudgetType
    budget_amount: Optional[int]
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    has_photos: bool
    created_at: datetime
    executor_id: Optional[int] = None

    class Config:
        orm_mode = True


class AvailableOrderDto(BaseModel):
    id: int
    title: str
    city: str
    address: str
    categories: List[str]
    description: str
    budget_type: BudgetType
    budget_amount: Optional[int]
    date_from: Optional[date]
    date_to: Optional[date]
    has_photos: bool
    created_at: datetime

class OrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    categories: Optional[List[str]] = None
    budget_type: Optional[BudgetType] = None
    budget_amount: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    class Config:
        extra = "ignore"

class AdminOrderOut(BaseModel):
    id: int
    title: str
    city: str
    status: str
    customer_id: int
    executor_id: Optional[int] = None
    created_at: datetime

    customer_name: str
    executor_name: Optional[str] = None

    class Config:
        orm_mode = True


class AdminOrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
