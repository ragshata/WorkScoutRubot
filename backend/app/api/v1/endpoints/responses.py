# app/api/v1/endpoints/responses.py
from bot.notifications import notify_new_response
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.order import Order
from app.models.response import Response
from app.models.user import User
from app.models.review import Review
from app.schemas.response import (
    ResponseCreate,
    ExecutorResponseDto,
    ExecutorResponseOrder,
    CustomerOrderResponseDto,
    ResponseExecutorShort,
)
from app.utils import str_to_list

router = APIRouter()


# ========== ОТКЛИКИ ИСПОЛНИТЕЛЯ ==========

@router.post(
    "/orders/{order_id}/responses",
    status_code=status.HTTP_204_NO_CONTENT,
)
def send_response(
    order_id: int,
    payload: ResponseCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("executor")),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.status != "active":
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.customer_id == current.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя откликаться на собственный заказ",
        )

    # валидатор: один waiting-отклик на заказ от одного исполнителя
    existing = (
        db.query(Response)
        .filter(
            Response.order_id == order_id,
            Response.executor_id == current.id,
            Response.status == "waiting",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="У вас уже есть активный отклик на этот заказ",
        )

    comment = (payload.comment or "").strip()
    if len(comment) < 3:
        raise HTTPException(
            status_code=400,
            detail="Комментарий слишком короткий",
        )

    if not payload.discuss_price and payload.price is None:
        raise HTTPException(
            status_code=400,
            detail="Укажите цену или выберите 'готов обсудить'",
        )

    resp = Response(
        order_id=order_id,
        executor_id=current.id,
        price=payload.price if not payload.discuss_price else None,
        comment=comment,
        status="waiting",
    )
    db.add(resp)
    db.commit()
    db.refresh(resp)

    # уведомляем заказчика о новом отклике
    try:
        notify_new_response(order, current)
    except Exception:
        # лучше не падать из-за нотификаций
        pass

    return None



@router.get(
    "/executor/responses",
    response_model=List[ExecutorResponseDto],
)
def get_executor_responses(
    db: Session = Depends(get_db),
    current: User = Depends(require_role("executor")),
):
    responses = (
        db.query(Response)
        .join(Order, Response.order_id == Order.id)
        .filter(Response.executor_id == current.id)
        .order_by(Response.created_at.desc())
        .all()
    )

    return [response_to_executor_dto(r) for r in responses]


# ========== СПИСОК ОТКЛИКОВ ДЛЯ ЗАКАЗЧИКА ПО КОНКРЕТНОМУ ЗАКАЗУ ==========

@router.get(
    "/orders/{order_id}/responses",
    response_model=List[CustomerOrderResponseDto],
)
def get_order_responses_for_customer(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    """
    Список откликов на конкретный заказ для заказчика.

    - заказ должен принадлежать текущему пользователю
    - для каждого исполнителя прикручиваем средний рейтинг по отзывам (approved)
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    responses = (
        db.query(Response)
        .join(User, Response.executor_id == User.id)
        .filter(Response.order_id == order.id)
        .order_by(Response.created_at.asc())
        .all()
    )

    if not responses:
        return []

    # Собираем id всех исполнителей в этом заказе
    executor_ids = {r.executor_id for r in responses}

    # Считаем средний рейтинг по отзывам (approved) для всех этих исполнителей разом
    rating_rows = (
        db.query(
            Review.target_user_id,
            func.avg(Review.rating).label("avg_rating"),
        )
        .filter(
            Review.target_user_id.in_(executor_ids),
            Review.status == "approved",
        )
        .group_by(Review.target_user_id)
        .all()
    )

    ratings_map: dict[int, float] = {
        row.target_user_id: round(row.avg_rating, 1) for row in rating_rows
        if row.avg_rating is not None
    }

    return [
        response_to_customer_dto(r, ratings_map.get(r.executor_id))
        for r in responses
    ]


# ========== ХЕЛПЕРЫ МАППИНГА ==========

def response_to_executor_dto(resp: Response) -> ExecutorResponseDto:
    order = resp.order
    return ExecutorResponseDto(
        id=resp.id,
        status=resp.status,  # type: ignore[arg-type]
        price=resp.price,
        comment=resp.comment,
        created_at=resp.created_at,
        order=ExecutorResponseOrder(
            id=order.id,
            title=order.title,
            city=order.city,
            address=order.address or "",
            categories=str_to_list(order.categories_raw),
            budget_label=_format_budget_label(order),
            dates_label=_format_dates_label(order),
        ),
    )


def response_to_customer_dto(
    resp: Response,
    rating: Optional[float],
) -> CustomerOrderResponseDto:
    executor = resp.executor
    executor_specs = str_to_list(executor.specializations_raw)

    return CustomerOrderResponseDto(
        id=resp.id,
        status=resp.status,  # type: ignore[arg-type]
        price=resp.price,
        comment=resp.comment,
        created_at=resp.created_at,
        executor=ResponseExecutorShort(
            id=executor.id,
            first_name=executor.first_name,
            last_name=executor.last_name,
            city=executor.city,
            specializations=executor_specs,
            rating=rating,
        ),
    )


def _format_budget_label(order: Order) -> str:
    if order.budget_type == "negotiable":
        return "Договорная"
    if order.budget_amount is None:
        return "Не указано"
    return f"{order.budget_amount:,.0f}".replace(",", " ") + " ₽"


def _format_dates_label(order: Order) -> str:
    f = order.start_date
    t = order.end_date

    if not f and not t:
        return "Сроки не указаны"

    def fmt(d):
        return d.strftime("%d.%m.%Y")

    if f and t:
        return f"{fmt(f)} — {fmt(t)}"
    if f:
        return f"С {fmt(f)}"
    return f"До {fmt(t)}"
