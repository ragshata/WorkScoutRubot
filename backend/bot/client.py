# bot/client.py

from typing import Optional

import requests

from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, WEBAPP_BASE_URL


class TelegramBotClient:
    def __init__(self, token: str):
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not set")
        self.base_url = f"https://api.telegram.org/bot{token}"

    def send_message(self, chat_id: int, text: str, reply_markup: Optional[dict] = None):
        """
        Простая обёртка над sendMessage.
        """
        payload: dict = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            requests.post(
                f"{self.base_url}/sendMessage",
                json=payload,
                timeout=5,
            )
        except Exception:
            # В проде сюда можно повесить логгер, сейчас просто молча игнорим
            pass

    # ===== УМНЫЕ ССЫЛКИ ДЛЯ WEBAPP =====

    def _build_startapp_link(self, payload: str) -> str:
        """
        Строим ссылку, которая открывает мини-апп с нужным startapp-параметром.
        Приоритет:
        1) WEBAPP_BASE_URL из env
        2) https://t.me/<BOT_USERNAME>/app?startapp=...
        """
        if WEBAPP_BASE_URL:
            sep = "&" if "?" in WEBAPP_BASE_URL else "?"
            return f"{WEBAPP_BASE_URL}{sep}startapp={payload}"

        if TELEGRAM_BOT_USERNAME:
            return f"https://t.me/{TELEGRAM_BOT_USERNAME}/app?startapp={payload}"

        # Если вообще ничего не настроено — вернём пустую строку
        return ""

    def build_order_link(self, order_id: int) -> str:
        return self._build_startapp_link(f"order_{order_id}")

    def build_my_orders_link(self) -> str:
        return self._build_startapp_link("my_orders")

    def build_create_order_link(self) -> str:
        return self._build_startapp_link("create_order")


_bot_instance: Optional[TelegramBotClient] = None


def get_bot() -> Optional[TelegramBotClient]:
    """
    Ленивая инициализация клиента.
    Если токен не задан — вернём None и уведомления просто не будут отправляться.
    """
    global _bot_instance
    if _bot_instance is not None:
        return _bot_instance

    if not TELEGRAM_BOT_TOKEN:
        return None

    try:
        _bot_instance = TelegramBotClient(TELEGRAM_BOT_TOKEN)
    except Exception:
        _bot_instance = None

    return _bot_instance
