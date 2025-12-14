# bot/main.py

import os
from typing import Final

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)

from bot.config import TELEGRAM_BOT_TOKEN, WEBAPP_BASE_URL, TELEGRAM_BOT_USERNAME


START_TEXT = (
    "Привет! Я бот WorkScout 👷‍♂️\n\n"
    "Здесь можно открыть мини-приложение, чтобы:\n"
    "• создать заказ\n"
    "• найти исполнителя\n"
    "• откликнуться на работу\n\n"
    "Жми кнопку ниже 👇"
)


def build_webapp_button() -> InlineKeyboardMarkup:
    """
    Кнопка 'Открыть WorkScout' с WebApp.
    Если WEBAPP_BASE_URL не задан — пытаемся собрать ссылку через t.me/<bot>/app.
    """
    url = WEBAPP_BASE_URL

    if not url and TELEGRAM_BOT_USERNAME:
        url = f"https://t.me/{TELEGRAM_BOT_USERNAME}/app"

    if not url:
        url = "https://t.me"

    keyboard = [
        [
            InlineKeyboardButton(
                text="🚀 Открыть WorkScout",
                web_app=WebAppInfo(url=url),
            )
        ]
    ]
    return InlineKeyboardMarkup(keyboard)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """ /start — приветствие + кнопка открытия WebApp. """
    keyboard = build_webapp_button()
    await update.message.reply_text(
        START_TEXT,
        reply_markup=keyboard,
    )


def build_application() -> Application:
    token: Final[str] = TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "")

    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан в окружении")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    return app


def main() -> None:
    app = build_application()
    # run_polling сам управляет event loop, его НЕ await'ят
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
