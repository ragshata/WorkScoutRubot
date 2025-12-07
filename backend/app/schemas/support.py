# app/schemas/support.py

from datetime import datetime
from typing import Literal, Optional, List

from pydantic import BaseModel


SupportStatus = Literal["open", "in_progress", "closed"]


class SupportCreate(BaseModel):
    topic: str
    message: str


class SupportOut(BaseModel):
    id: int
    user_id: int
    topic: str
    message: str
    status: SupportStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SupportAdminOut(BaseModel):
    id: int
    user_id: int
    topic: str
    message: str
    status: SupportStatus
    created_at: datetime
    updated_at: datetime

    user_name: str
    user_phone: Optional[str] = None

    class Config:
        orm_mode = True


class SupportUpdate(BaseModel):
    status: SupportStatus
