# app/schemas/admin.py

from typing import Optional

from pydantic import BaseModel


class OrdersByStatus(BaseModel):
    active: int
    in_progress: int
    done: int
    cancelled: int


class AdminStatsOut(BaseModel):
    total_users: int
    total_customers: int
    total_executors: int
    total_admins: int

    total_orders: int
    orders_by_status: OrdersByStatus

    total_responses: int
    total_reviews: int
    approved_reviews: int

    # среднее время до первого отклика (по заказам в выборке), в часах
    avg_time_to_first_response_hours: Optional[float]
