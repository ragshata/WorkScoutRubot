# app/schemas/response.py

from datetime import datetime
from typing import Optional, Literal, List

from pydantic import BaseModel


ResponseStatus = Literal["waiting", "chosen", "declined", "done"]


class ResponseCreate(BaseModel):
    price: Optional[int] = None
    discuss_price: bool
    comment: str


class ExecutorResponseOrder(BaseModel):
    id: int
    title: str
    city: str
    address: str
    categories: List[str]
    budget_label: str
    dates_label: str
    customer_id: int


class ExecutorResponseDto(BaseModel):
    id: int
    status: ResponseStatus
    price: Optional[int]
    comment: str
    created_at: datetime
    order: ExecutorResponseOrder


# ========== ДЛЯ ЗАКАЗЧИКА (список откликов по заказу) ==========

class ResponseExecutorShort(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    city: Optional[str] = None
    specializations: List[str] = []
    rating: Optional[float] = None  # на будущее, можно считать по отзывам

    class Config:
        orm_mode = True


class CustomerOrderResponseDto(BaseModel):
    id: int
    status: ResponseStatus
    price: Optional[int]
    comment: str
    created_at: datetime
    executor: ResponseExecutorShort


# ========== ДЛЯ ВЫБОРА ИСПОЛНИТЕЛЯ ==========

class ChooseExecutorPayload(BaseModel):
    response_id: int
