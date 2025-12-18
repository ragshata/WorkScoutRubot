# bot/main.py
import os
from typing import Final

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

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
    url = WEBAPP_BASE_URL

    # запасной вариант, если у тебя настроен Bot Web App в @BotFather
    if not url and TELEGRAM_BOT_USERNAME:
        url = f"https://t.me/{TELEGRAM_BOT_USERNAME}/app"

    if not url:
        url = "https://t.me"

    keyboard = [[InlineKeyboardButton("🚀 Открыть WorkScout", web_app=WebAppInfo(url=url))]]
    return InlineKeyboardMarkup(keyboard)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(START_TEXT, reply_markup=build_webapp_button())

def build_application() -> Application:
    token: Final[str] = TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан в окружении")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    return app

if __name__ == "__main__":
    app = build_application()
    print("Бот запущен.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)
