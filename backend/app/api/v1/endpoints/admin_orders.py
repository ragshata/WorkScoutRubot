# app/api/v1/endpoints/admin_orders.py

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.order import Order
from app.models.user import User
from app.schemas.order import AdminOrderOut, AdminOrderUpdate, OrderStatus

router = APIRouter(prefix="/admin")


@router.get(
    "/orders",
    response_model=List[AdminOrderOut],
)
def list_orders_admin(
    status_filter: Optional[OrderStatus] = Query(
        default=None,
        description="Фильтр по статусу: active / in_progress / done / cancelled",
    ),
    city: Optional[str] = Query(
        default=None,
        description="Фильтр по городу",
    ),
    customer_id: Optional[int] = Query(
        default=None,
        description="Фильтр по заказчику",
    ),
    executor_id: Optional[int] = Query(
        default=None,
        description="Фильтр по исполнителю",
    ),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Список заказов для админа с фильтрами.
    """
    q = (
        db.query(Order)
        .join(User, Order.customer_id == User.id)
    )

    if status_filter is not None:
        q = q.filter(Order.status == status_filter)

    if city is not None:
        q = q.filter(Order.city == city)

    if customer_id is not None:
        q = q.filter(Order.customer_id == customer_id)

    if executor_id is not None:
        q = q.filter(Order.executor_id == executor_id)

    orders = q.order_by(Order.created_at.desc()).all()

    return [_to_admin_order_out(o) for o in orders]


@router.patch(
    "/orders/{order_id}",
    response_model=AdminOrderOut,
)
def update_order_admin(
    order_id: int,
    payload: AdminOrderUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """
    Админ меняет статус заказа (ручное завершение/отмена и т.п.).
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    data = payload.dict(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        order.status = data["status"]

    db.add(order)
    db.commit()
    db.refresh(order)

    return _to_admin_order_out(order)


def _to_admin_order_out(order: Order) -> AdminOrderOut:
    customer = order.customer
    executor = order.executor

    if customer and customer.last_name:
        customer_name = f"{customer.first_name} {customer.last_name}"
    elif customer:
        customer_name = customer.first_name
    else:
        customer_name = "Неизвестный"

    if executor and executor.last_name:
        executor_name = f"{executor.first_name} {executor.last_name}"
    elif executor:
        executor_name = executor.first_name
    else:
        executor_name = None

    return AdminOrderOut(
        id=order.id,
        title=order.title,
        city=order.city,
        status=order.status,
        customer_id=order.customer_id,
        executor_id=order.executor_id,
        created_at=order.created_at,
        customer_name=customer_name,
        executor_name=executor_name,
    )
