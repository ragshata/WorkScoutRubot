from bot.notifications import notify_executor_chosen
from datetime import datetime, timedelta
from typing import List, Optional
import os
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, get_current_user
from app.models.order import Order
from app.models.user import User
from app.models.response import Response
from app.models.chat import Chat
from app.schemas.order import OrderCreate, OrderOut, AvailableOrderDto, OrderUpdate
from app.schemas.response import ChooseExecutorPayload
from app.schemas.chat import ChatLinkOut, ChatContactsOut, ParticipantContact
from app.utils import list_to_str, str_to_list

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
)

# сколько дней считаем "свежим" заказом
FRESH_DAYS = 3

# ===== загрузка фото заказа =====
MAX_FILES = 3
MAX_BYTES = 8 * 1024 * 1024
ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

ORDER_PHOTO_DIR = Path(
    os.getenv("ORDER_PHOTO_DIR", "/opt/workscout/current/backend/media/orders")
)
PUBLIC_MEDIA_BASE = os.getenv("PUBLIC_MEDIA_BASE", "https://workscout.ru/media")


def _save_order_photo(order_id: int, content: bytes, ext: str) -> str:
    ORDER_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"o{order_id}_{int(time.time() * 1000)}.{ext}"
    (ORDER_PHOTO_DIR / filename).write_bytes(content)
    return f"{PUBLIC_MEDIA_BASE}/orders/{filename}"


@router.post("/", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    order = Order(
        customer_id=current.id,
        title=payload.title,
        description=payload.description,
        city=payload.city,
        address=payload.address,
        categories_raw=list_to_str(payload.categories),
        budget_type=payload.budget_type,
        budget_amount=payload.budget_amount,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="active",
        has_photos=False,
        # photos_raw оставляем пустым
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_to_out(order)


@router.post("/{order_id}/photos")
async def upload_order_photos(
    order_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    existing = str_to_list(getattr(order, "photos_raw", None))
    if len(existing) >= MAX_FILES:
        raise HTTPException(status_code=400, detail="Фото уже загружены (максимум 3)")

    if not files:
        return {"photos": existing, "has_photos": order.has_photos}

    # сколько ещё можно добавить
    remaining = MAX_FILES - len(existing)
    files = files[:remaining]

    new_urls: List[str] = []
    for f in files:
        if f.content_type not in ALLOWED:
            raise HTTPException(
                status_code=400, detail="Разрешены только jpg/png/webp"
            )

        content = await f.read()
        if len(content) > MAX_BYTES:
            raise HTTPException(
                status_code=400, detail="Файл слишком большой (макс 8MB)"
            )

        ext = ALLOWED[f.content_type]
        new_urls.append(_save_order_photo(order.id, content, ext))

    merged = (existing + new_urls)[:MAX_FILES]
    order.photos_raw = list_to_str(merged)
    order.has_photos = len(merged) > 0

    db.add(order)
    db.commit()
    db.refresh(order)

    return {"photos": merged, "has_photos": order.has_photos}


@router.get("/all-active", response_model=List[AvailableOrderDto])
def get_all_active_orders(
    db: Session = Depends(get_db),
    current: User = Depends(require_role("executor")),
):
    """
    Максимально тупая и надежная выдача:
    - все заказы со статусом active
    - без фильтров по городу/категориям/специализациям
    - не показываем исполнителю заказы, которые он сам создал как customer (если вдруг роли пересекутся)
    """
    orders = (
        db.query(Order)
        .filter(Order.status == "active")
        .filter(Order.customer_id != current.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return [_order_to_available(o) for o in orders]


@router.get("/available", response_model=List[AvailableOrderDto])
def get_available_orders(
    city: Optional[str] = Query(default=None),
    categories: Optional[str] = Query(
        default=None, description="Строка категорий через запятую"
    ),
    fresh_only: bool = Query(default=False),
    show_all: bool = Query(
        default=False,
        description="Если true — не применять автофильтры по городу и специализациям исполнителя",
    ),
    db: Session = Depends(get_db),
    current: User = Depends(require_role("executor")),
):
    """
    Лента доступных заказов для исполнителя.
    Текущий пользователь определяется строго через Telegram initData (X-Tg-Init-Data).
    """

    # --- Базовый запрос: активные заказы ---
    q = db.query(Order).filter(Order.status == "active")

    # Не показываем исполнителю его собственные заказы как заказчика
    q = q.filter(Order.customer_id != current.id)

    # --- Город ---
    if city is not None:
        q = q.filter(Order.city == city)
    elif not show_all and current.city:
        q = q.filter(Order.city == current.city)

    # --- Свежие заказы ---
    if fresh_only:
        threshold = datetime.utcnow() - timedelta(days=FRESH_DAYS)
        q = q.filter(Order.created_at >= threshold)

    orders = q.order_by(Order.created_at.desc()).all()

    # --- Категории из query-параметра ---
    query_categories: set[str] = set()
    if categories:
        query_categories = {c.strip() for c in categories.split(",") if c.strip()}

    # --- Специализации исполнителя ---
    executor_specs: set[str] = set()
    if current.specializations_raw:
        executor_specs = set(str_to_list(current.specializations_raw))

    filtered: List[Order] = []
    for o in orders:
        order_cats = set(str_to_list(o.categories_raw))

        if query_categories:
            if order_cats & query_categories:
                filtered.append(o)
            continue

        if not show_all and executor_specs:
            if order_cats & executor_specs:
                filtered.append(o)
            continue

        filtered.append(o)

    return [_order_to_available(o) for o in filtered]


@router.get("/my", response_model=List[OrderOut])
def get_my_orders(
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    orders = (
        db.query(Order)
        .filter(Order.customer_id == current.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_to_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    """
    Получить один свой заказ (для экрана 'Подробнее' / редактирования).
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    return _order_to_out(order)


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    """
    Редактирование заказа.
    Только владелец, только свои заказы.
    Логика: редактировать можно активный / в работе,
    но не 'cancelled' и не 'done'.
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status in ("cancelled", "done"):
        raise HTTPException(
            status_code=400,
            detail="Этот заказ уже нельзя редактировать",
        )

    data = payload.dict(exclude_unset=True)

    if "title" in data:
        order.title = data["title"]
    if "description" in data:
        order.description = data["description"]
    if "city" in data:
        order.city = data["city"]
    if "address" in data:
        order.address = data["address"]

    if "categories" in data:
        order.categories_raw = list_to_str(data["categories"])

    if "budget_type" in data:
        order.budget_type = data["budget_type"]
        # если сделали договорную и не прислали сумму — обнулим
        if order.budget_type == "negotiable" and "budget_amount" not in data:
            order.budget_amount = None

    if "budget_amount" in data:
        order.budget_amount = data["budget_amount"]

    if "start_date" in data:
        order.start_date = data["start_date"]
    if "end_date" in data:
        order.end_date = data["end_date"]

    db.add(order)
    db.commit()
    db.refresh(order)

    return _order_to_out(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    order.status = "cancelled"
    db.add(order)
    db.commit()
    return None


# =========================
# ВЫБОР ИСПОЛНИТЕЛЯ
# =========================

@router.post(
    "/{order_id}/choose_executor",
    response_model=OrderOut,
)
def choose_executor(
    order_id: int,
    payload: ChooseExecutorPayload,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("customer")),
):
    # Находим заказ текущего заказчика
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.customer_id == current.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status not in ("active", "in_progress"):
        raise HTTPException(
            status_code=400,
            detail="Нельзя выбрать исполнителя для этого заказа",
        )

    # Отклик
    response = (
        db.query(Response)
        .filter(
            Response.id == payload.response_id,
            Response.order_id == order.id,
        )
        .first()
    )
    if not response:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    if response.status != "waiting":
        raise HTTPException(
            status_code=400,
            detail="Можно выбрать только отклик в статусе 'waiting'",
        )

    # Обновляем заказ
    order.executor_id = response.executor_id
    order.status = "in_progress"

    # Статусы откликов
    response.status = "chosen"
    (
        db.query(Response)
        .filter(
            Response.order_id == order.id,
            Response.id != response.id,
            Response.status == "waiting",
        )
        .update({Response.status: "declined"}, synchronize_session=False)
    )

    # Создаём чат, если ещё нет
    existing_chat = db.query(Chat).filter(Chat.order_id == order.id).first()
    if not existing_chat:
        chat = Chat(
            order_id=order.id,
            customer_id=order.customer_id,
            executor_id=order.executor_id,
        )
        db.add(chat)

    db.add(order)
    db.add(response)
    db.commit()
    db.refresh(order)

    # уведомляем исполнителя, что его выбрали
    try:
        notify_executor_chosen(order)
    except Exception:
        pass

    return _order_to_out(order)


# =========================
# CHAT-LINK в Telegram
# =========================

@router.get(
    "/{order_id}/chat-link",
    response_model=ChatLinkOut,
)
def get_chat_link(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Находим заказ
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.executor_id is None:
        raise HTTPException(
            status_code=404,
            detail="Чат для этого заказа не найден (исполнитель не выбран)",
        )

    # Проверяем, что текущий пользователь — участник
    if current.id not in (order.customer_id, order.executor_id):
        raise HTTPException(status_code=403, detail="Нет доступа к этому чату")

    # Определяем "вторую сторону"
    if current.id == order.customer_id:
        other_id = order.executor_id
    else:
        other_id = order.customer_id

    other_user = db.query(User).filter(User.id == other_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Второй участник чата не найден")

    if other_user.telegram_id is None:
        raise HTTPException(
            status_code=400,
            detail="У второго участника не указан Telegram ID",
        )

    # Линк на личку в Telegram
    chat_link = f"tg://user?id={other_user.telegram_id}"

    return ChatLinkOut(
        order_id=order.id,
        other_user_id=other_user.id,
        other_telegram_id=other_user.telegram_id,
        chat_link=chat_link,
    )


# =========================
# ПОКАЗАТЬ КОНТАКТЫ (ВЗАИМНОЕ СОГЛАСИЕ)
# =========================

@router.post(
    "/{order_id}/show-contacts",
    response_model=ChatContactsOut,
)
def show_contacts(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Находим заказ и проверяем, что чат возможен
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.executor_id is None:
        raise HTTPException(
            status_code=404,
            detail="Чат для этого заказа не найден (исполнитель не выбран)",
        )

    # Проверяем, что текущий пользователь — участник
    if current.id not in (order.customer_id, order.executor_id):
        raise HTTPException(status_code=403, detail="Нет доступа к этому чату")

    chat = db.query(Chat).filter(Chat.order_id == order.id).first()
    if not chat:
        chat = Chat(
            order_id=order.id,
            customer_id=order.customer_id,
            executor_id=order.executor_id,
        )
        db.add(chat)
        db.flush()

    # помечаем согласие текущего юзера
    if current.id == order.customer_id:
        chat.customer_contacts_shown = True
    elif current.id == order.executor_id:
        chat.executor_contacts_shown = True

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return _build_chat_contacts(chat, db)


# =========================
# ЗАВЕРШИТЬ ЗАКАЗ (status=done)
# =========================

@router.post(
    "/{order_id}/complete",
    response_model=OrderOut,
)
def complete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Только участники сделки могут завершать заказ
    if current.id not in (order.customer_id, order.executor_id):
        raise HTTPException(status_code=403, detail="Нет доступа к этому заказу")

    if order.status == "done":
        return _order_to_out(order)

    if order.status not in ("in_progress", "active"):
        raise HTTPException(
            status_code=400,
            detail="Этот заказ нельзя завершить в текущем статусе",
        )

    order.status = "done"

    db.add(order)
    db.commit()
    db.refresh(order)

    return _order_to_out(order)


# =========================
# ХЕЛПЕРЫ
# =========================

def _build_chat_contacts(chat: Chat, db: Session) -> ChatContactsOut:
    customer = db.query(User).filter(User.id == chat.customer_id).first()
    executor = db.query(User).filter(User.id == chat.executor_id).first()

    customer_accepted = chat.customer_contacts_shown
    executor_accepted = chat.executor_contacts_shown
    both_accepted = customer_accepted and executor_accepted

    customer_contact: Optional[ParticipantContact] = None
    executor_contact: Optional[ParticipantContact] = None

    if both_accepted:
        if customer:
            customer_contact = ParticipantContact(
                user_id=customer.id,
                first_name=customer.first_name,
                last_name=customer.last_name,
                phone=customer.phone,
                telegram_id=customer.telegram_id,
            )
        if executor:
            executor_contact = ParticipantContact(
                user_id=executor.id,
                first_name=executor.first_name,
                last_name=executor.last_name,
                phone=executor.phone,
                telegram_id=executor.telegram_id,
            )

    return ChatContactsOut(
        order_id=chat.order_id,
        customer_accepted=customer_accepted,
        executor_accepted=executor_accepted,
        both_accepted=both_accepted,
        customer=customer_contact,
        executor=executor_contact,
    )


def _order_to_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        title=order.title,
        description=order.description,
        city=order.city,
        address=order.address,
        categories=str_to_list(order.categories_raw),
        budget_type=order.budget_type,  # type: ignore[arg-type]
        budget_amount=order.budget_amount,
        start_date=order.start_date,
        end_date=order.end_date,
        status=order.status,
        has_photos=order.has_photos,
        photos=str_to_list(getattr(order, "photos_raw", None)),
        created_at=order.created_at,
        executor_id=order.executor_id,
    )


def _order_to_available(order: Order) -> AvailableOrderDto:
    return AvailableOrderDto(
        id=order.id,
        title=order.title,
        city=order.city,
        address=order.address or "",
        categories=str_to_list(order.categories_raw),
        description=order.description,
        budget_type=order.budget_type,  # type: ignore[arg-type]
        budget_amount=order.budget_amount,
        date_from=order.start_date,
        date_to=order.end_date,
        has_photos=order.has_photos,
        photos=str_to_list(getattr(order, "photos_raw", None)),
        created_at=order.created_at,
    )
