# bot/config.py

import os

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")

# Базовый URL WebApp-а.
# Примеры:
#   https://t.me/<your_bot_username>/app
#   или свой домен с мини-аппом, типа https://workscout.yourdomain.com
WEBAPP_BASE_URL = os.getenv("WEBAPP_BASE_URL", "")
