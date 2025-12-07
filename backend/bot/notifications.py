# bot/notifications.py

from typing import Optional

from .client import get_bot


def _safe_user_name(user) -> str:
    # user: app.models.user.User
    if not user:
        return "Пользователь"
    if getattr(user, "last_name", None):
        return f"{user.first_name} {user.last_name}"
    return user.first_name


# ========== УВЕДОМЛЕНИЯ ==========

def notify_new_response(order, executor) -> None:
    """
    Новый отклик на заказ → уведомляем заказчика.
    order: app.models.order.Order
    executor: app.models.user.User (исполнитель)
    """
    bot = get_bot()
    if not bot:
        return

    customer = order.customer
    if not customer or not customer.telegram_id:
        return

    exec_name = _safe_user_name(executor)
    text = (
        f"🛠 Новый отклик на ваш заказ «{order.title}»\n\n"
        f"Исполнитель: {exec_name}\n"
        f"Город: {executor.city or '—'}"
    )

    order_link = bot.build_order_link(order.id)
    my_orders_link = bot.build_my_orders_link()

    buttons = []

    if order_link:
        buttons.append({"text": "Открыть заказ", "url": order_link})
    if my_orders_link:
        buttons.append({"text": "Мои заказы", "url": my_orders_link})

    reply_markup = {"inline_keyboard": [buttons]} if buttons else None

    bot.send_message(chat_id=customer.telegram_id, text=text, reply_markup=reply_markup)


def notify_executor_chosen(order) -> None:
    """
    Заказчик выбрал исполнителя → уведомляем исполнителя.
    order: app.models.order.Order (у него уже должен быть executor_id)
    """
    bot = get_bot()
    if not bot:
        return

    executor = order.executor
    customer = order.customer

    if not executor or not executor.telegram_id:
        return

    customer_name = _safe_user_name(customer)

    text = (
        f"✅ Вас выбрали исполнителем по заказу «{order.title}»\n\n"
        f"Заказчик: {customer_name}\n"
        f"Город: {order.city}"
    )

    order_link = bot.build_order_link(order.id)

    # Линк в личку с заказчиком, если у него есть telegram_id
    chat_with_customer_link: Optional[str] = None
    if customer and customer.telegram_id:
        chat_with_customer_link = f"tg://user?id={customer.telegram_id}"

    buttons_row1 = []
    buttons_row2 = []

    if order_link:
        buttons_row1.append({"text": "Открыть заказ", "url": order_link})

    if chat_with_customer_link:
        buttons_row2.append({"text": "Написать заказчику", "url": chat_with_customer_link})

    inline_keyboard = []
    if buttons_row1:
        inline_keyboard.append(buttons_row1)
    if buttons_row2:
        inline_keyboard.append(buttons_row2)

    reply_markup = {"inline_keyboard": inline_keyboard} if inline_keyboard else None

    bot.send_message(chat_id=executor.telegram_id, text=text, reply_markup=reply_markup)


# На будущее — нотификация о новых сообщениях (если будешь логировать их у себя)
def notify_new_chat_message(chat, from_user, to_user) -> None:
    """
    Заглушка под будущие уведомления по сообщениям в чате.
    chat: app.models.chat.Chat
    from_user/to_user: app.models.user.User
    """
    bot = get_bot()
    if not bot:
        return

    if not to_user or not to_user.telegram_id:
        return

    text = (
        f"💬 Новое сообщение по заказу #{chat.order_id} "
        f"от {_safe_user_name(from_user)}"
    )

    order_link = bot.build_order_link(chat.order_id)
    buttons = []
    if order_link:
        buttons.append({"text": "Открыть заказ", "url": order_link})

    reply_markup = {"inline_keyboard": [buttons]} if buttons else None

    bot.send_message(chat_id=to_user.telegram_id, text=text, reply_markup=reply_markup)
