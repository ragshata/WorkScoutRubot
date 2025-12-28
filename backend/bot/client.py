# bot/client.py

from typing import Optional
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote

import requests

from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, WEBAPP_BASE_URL


class TelegramBotClient:
    def __init__(self, token: str):
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not set")
        self.base_url = f"https://api.telegram.org/bot{token}"

    def send_message(self, chat_id: int, text: str, reply_markup: Optional[dict] = None):
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
            pass

    # ===== WEBAPP LINKS =====

    @staticmethod
    def _sanitize_start_param(value: str) -> str:
        """
        Telegram startapp payload: лучше держаться коротких и безопасных значений.
        На практике лимит у start/startapp в Telegram маленький, поэтому режем до 64.
        Разрешаем A-Z a-z 0-9 _ -
        Остальное кодируем.
        """
        if not value:
            return ""
        value = value.strip()[:64]
        return quote(value, safe="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")

    @staticmethod
    def _normalize_webapp_base(raw: str) -> str:
        """
        Делает WEBAPP_BASE_URL устойчивым к кривым значениям типа:
        - https://t.me/Bot/app?startapp=open
        - https://t.me/Bot?startapp=open
        - https://t.me/Bot/app
        Превращает это в базу без /app и без startapp/startApp.
        """
        s = (raw or "").strip()
        if not s:
            return ""

        parts = urlsplit(s)

        # убираем /app в конце пути, потому что у тебя работает без него
        path = parts.path or ""
        if path.rstrip("/").endswith("/app"):
            path = path.rstrip("/")
            path = path[: -len("/app")] or ""

        # чистим query от startapp/startApp/start
        q = [(k, v) for (k, v) in parse_qsl(parts.query, keep_blank_values=True)
             if k not in ("startapp", "startApp", "start")]

        clean_query = urlencode(q, doseq=True)

        return urlunsplit((parts.scheme, parts.netloc, path, clean_query, ""))

    def _build_startapp_link(self, start_param: str) -> str:
        sp = self._sanitize_start_param(start_param)
        if not sp:
            return ""

        # 1) base из env, но нормализованный (без /app и без startapp в query)
        base = self._normalize_webapp_base(WEBAPP_BASE_URL) if WEBAPP_BASE_URL else ""

        # 2) иначе стандартный deep-link на бота
        if not base and TELEGRAM_BOT_USERNAME:
            base = f"https://t.me/{TELEGRAM_BOT_USERNAME}"

        if not base:
            return ""

        parts = urlsplit(base)
        q = parse_qsl(parts.query, keep_blank_values=True)

        # гарантированно ставим startapp, даже если кто-то пытался подсунуть другое
        q = [(k, v) for (k, v) in q if k not in ("startapp", "startApp", "start")]
        q.append(("startapp", sp))

        final_query = urlencode(q, doseq=True)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, final_query, ""))

    def build_order_link(self, order_id: int) -> str:
        return self._build_startapp_link(f"order_{order_id}")

    def build_my_orders_link(self) -> str:
        return self._build_startapp_link("my_orders")

    def build_create_order_link(self) -> str:
        return self._build_startapp_link("create_order")


_bot_instance: Optional[TelegramBotClient] = None


def get_bot() -> Optional[TelegramBotClient]:
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
