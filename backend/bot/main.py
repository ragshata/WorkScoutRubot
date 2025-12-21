import os
import logging
from urllib.parse import quote

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

from bot.config import TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("workscout-bot")

START_TEXT = (
    "Привет! Я бот WorkScout 👷‍♂️\n\n"
    "Жми кнопку ниже, чтобы открыть мини-приложение 👇"
)

# что передавать в startapp (можешь менять как хочешь)
STARTAPP_PAYLOAD = os.getenv("STARTAPP_PAYLOAD", "open").strip()
STARTAPP_MODE = os.getenv("STARTAPP_MODE", "").strip()  # например: "compact"

def _clean_username(u: str) -> str:
    return (u or "").strip().lstrip("@")

def build_startapp_link() -> str:
    username = _clean_username(TELEGRAM_BOT_USERNAME)
    if not username:
        return "https://t.me"

    # ВАЖНО: это формат для Main Mini App:
    # https://t.me/botusername?startapp=payload
    base = f"https://t.me/{username}?startapp={quote(STARTAPP_PAYLOAD)}"

    if STARTAPP_MODE:
        base += f"&mode={quote(STARTAPP_MODE)}"

    return base

def build_keyboard() -> InlineKeyboardMarkup:
    url = build_startapp_link()
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🚀 Открыть WorkScout", url=url)
    ]])

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message:
        await update.message.reply_text(START_TEXT, reply_markup=build_keyboard())

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    log.exception("Unhandled error: %s", context.error)

def main() -> None:
    token = (TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "")).strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_error_handler(error_handler)

    log.info("Бот запущен.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
