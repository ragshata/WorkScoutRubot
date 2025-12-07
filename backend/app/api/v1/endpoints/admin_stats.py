# app/api/v1/endpoints/admin_stats.py

from datetime import datetime, time
from typing import Optional, List, Tuple

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.order import Order
from app.models.response import Response
from app.models.review import Review
from app.schemas.admin import AdminStatsOut, OrdersByStatus

router = APIRouter(prefix="/admin")


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    # ждём формат YYYY-MM-DD
    return datetime.strptime(date_str, "%Y-%m-%d")


@router.get(
    "/stats",
    response_model=AdminStatsOut,
)
def get_admin_stats(
    date_from: Optional[str] = Query(
        default=None,
        description="Дата от (YYYY-MM-DD) для фильтра по заказам/откликам/отзывам",
    ),
    date_to: Optional[str] = Query(
        default=None,
        description="Дата до (YYYY-MM-DD) включительно",
    ),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Базовая аналитика для админа.

    Фильтры по датам применяются к:
    - заказам (Order.created_at),
    - откликам (Response.created_at),
    - отзывам (Review.created_at).
    """
    start_dt = _parse_date(date_from)
    end_dt = _parse_date(date_to)
    if end_dt:
        # включительно: конец дня
        end_dt = datetime.combine(end_dt.date(), time(23, 59, 59))

    # ===== Пользователи (глобально, без фильтра по датам) =====
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_customers = (
        db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    )
    total_executors = (
        db.query(func.count(User.id)).filter(User.role == "executor").scalar() or 0
    )
    total_admins = (
        db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    )

    # ===== Заказы =====
    orders_q = db.query(Order)
    if start_dt:
        orders_q = orders_q.filter(Order.created_at >= start_dt)
    if end_dt:
        orders_q = orders_q.filter(Order.created_at <= end_dt)

    total_orders = orders_q.count()

    # распределение по статусам
    status_counts = {s: 0 for s in ["active", "in_progress", "done", "cancelled"]}
    rows = (
        db.query(Order.status, func.count(Order.id))
        .filter(
            *( [Order.created_at >= start_dt] if start_dt else [] ),
            *( [Order.created_at <= end_dt] if end_dt else [] ),
        )
        .group_by(Order.status)
        .all()
    )
    for status_value, cnt in rows:
        if status_value in status_counts:
            status_counts[status_value] = cnt or 0

    orders_by_status = OrdersByStatus(
        active=status_counts["active"],
        in_progress=status_counts["in_progress"],
        done=status_counts["done"],
        cancelled=status_counts["cancelled"],
    )

    # ===== Отклики =====
    responses_q = db.query(Response)
    if start_dt:
        responses_q = responses_q.filter(Response.created_at >= start_dt)
    if end_dt:
        responses_q = responses_q.filter(Response.created_at <= end_dt)
    total_responses = responses_q.count()

    # ===== Отзывы =====
    reviews_q = db.query(Review)
    if start_dt:
        reviews_q = reviews_q.filter(Review.created_at >= start_dt)
    if end_dt:
        reviews_q = reviews_q.filter(Review.created_at <= end_dt)

    total_reviews = reviews_q.count()
    approved_reviews = reviews_q.filter(Review.status == "approved").count()

    # ===== Среднее время до первого отклика (в часах) =====
    # Берём заказы в выборке + их первый отклик.
    first_res_subq = (
        db.query(
            Response.order_id.label("order_id"),
            func.min(Response.created_at).label("first_response_at"),
        )
        .group_by(Response.order_id)
        .subquery()
    )

    orders_with_first = (
        db.query(
            Order.created_at.label("order_created_at"),
            first_res_subq.c.first_response_at,
        )
        .join(first_res_subq, first_res_subq.c.order_id == Order.id)
    )

    if start_dt:
        orders_with_first = orders_with_first.filter(
            Order.created_at >= start_dt
        )
    if end_dt:
        orders_with_first = orders_with_first.filter(
            Order.created_at <= end_dt
        )

    rows_time: List[Tuple[datetime, datetime]] = orders_with_first.all()

    diffs_hours: List[float] = []
    for created_at, first_resp_at in rows_time:
        if created_at and first_resp_at:
            delta = first_resp_at - created_at
            diffs_hours.append(delta.total_seconds() / 3600.0)

    avg_time: Optional[float] = None
    if diffs_hours:
        avg_time = round(sum(diffs_hours) / len(diffs_hours), 2)

    return AdminStatsOut(
        total_users=total_users,
        total_customers=total_customers,
        total_executors=total_executors,
        total_admins=total_admins,
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        total_responses=total_responses,
        total_reviews=total_reviews,
        approved_reviews=approved_reviews,
        avg_time_to_first_response_hours=avg_time,
    )
