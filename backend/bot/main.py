# bot/main.py
import os
import logging
from typing import Final, Optional
from urllib.parse import quote

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

from bot.config import TELEGRAM_BOT_TOKEN, WEBAPP_BASE_URL, TELEGRAM_BOT_USERNAME

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("workscout-bot")

START_TEXT = (
    "Привет! Я бот WorkScout 👷‍♂️\n\n"
    "Здесь можно открыть мини-приложение, чтобы:\n"
    "• создать заказ\n"
    "• найти исполнителя\n"
    "• откликнуться на работу\n\n"
    "Жми кнопку ниже 👇"
)

# опционально: что передавать в startapp (например user=123, role=executor и т.п.)
STARTAPP_PAYLOAD: str = os.getenv("STARTAPP_PAYLOAD", "").strip()


def _clean_username(username: Optional[str]) -> str:
    if not username:
        return ""
    return username.strip().lstrip("@")  # убираем @ если кто-то опять “украсил”


def build_open_button() -> InlineKeyboardMarkup:
    """
    Приоритет:
    1) WEBAPP_BASE_URL (https://...) -> настоящая WebApp кнопка (рекомендовано)
    2) deep link через startapp -> обычная кнопка url на t.me/<bot>/app?startapp=...
    3) fallback -> ссылка на t.me
    """
    url = (WEBAPP_BASE_URL or "").strip()
    username = _clean_username(TELEGRAM_BOT_USERNAME)

    # 1) НОРМАЛЬНЫЙ WebApp: только https-домен, НЕ t.me
    if url.startswith("https://"):
        button = InlineKeyboardButton("🚀 Открыть WorkScout", web_app=WebAppInfo(url=url))
        return InlineKeyboardMarkup([[button]])

    # 2) StartApp deep link: работает, если Mini App настроено у бота (в BotFather)
    if username:
        deeplink = f"https://t.me/{username}/app"
        if STARTAPP_PAYLOAD:
            deeplink += f"?startapp={quote(STARTAPP_PAYLOAD)}"

        # ВАЖНО: тут именно url=..., а не web_app=...
        button = InlineKeyboardButton("🚀 Открыть WorkScout", url=deeplink)
        return InlineKeyboardMarkup([[button]])

    # 3) Ну хоть куда-нибудь
    button = InlineKeyboardButton("🚀 Открыть WorkScout", url="https://t.me")
    return InlineKeyboardMarkup([[button]])


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message:
        await update.message.reply_text(START_TEXT, reply_markup=build_open_button())


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.exception("Unhandled error: %s", context.error)


def build_application() -> Application:
    token: Final[str] = (TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "")).strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан в окружении")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_error_handler(error_handler)
    return app


def main() -> None:
    app = build_application()
    logger.info("Бот запущен.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
