# app/schemas/chat.py

from typing import Optional

from pydantic import BaseModel


class ChatLinkOut(BaseModel):
    order_id: int
    other_user_id: int
    other_telegram_id: int
    chat_link: str


class ParticipantContact(BaseModel):
    user_id: int
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    telegram_id: Optional[int] = None


class ChatContactsOut(BaseModel):
    order_id: int
    customer_accepted: bool
    executor_accepted: bool
    both_accepted: bool
    customer: Optional[ParticipantContact] = None
    executor: Optional[ParticipantContact] = None
