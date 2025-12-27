import os
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import httpx

MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5MB

AVATAR_DIR = Path(os.getenv("AVATAR_DIR", "/opt/workscout/current/backend/media/avatars"))
PUBLIC_MEDIA_BASE = os.getenv("PUBLIC_MEDIA_BASE", "https://workscout.ru/media")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


def _save_avatar_bytes(user_id: int, content: bytes, ext: str = "jpg") -> str:
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"u{user_id}_{int(time.time())}.{ext}"
    path = AVATAR_DIR / filename
    path.write_bytes(content)
    return f"{PUBLIC_MEDIA_BASE}/avatars/{filename}"


def _download_url_bytes(url: str) -> bytes:
    with httpx.Client(timeout=15, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        content = r.content
        if len(content) > MAX_AVATAR_BYTES:
            raise ValueError("Avatar too large")
        return content


def _download_avatar_via_bot(telegram_user_id: int) -> Optional[bytes]:
    if not TELEGRAM_BOT_TOKEN:
        return None

    base = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

    with httpx.Client(timeout=15) as client:
        r = client.get(f"{base}/getUserProfilePhotos", params={"user_id": telegram_user_id, "limit": 1})
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            return None

        photos = data.get("result", {}).get("photos", [])
        if not photos or not photos[0]:
            return None

        file_id = photos[0][-1]["file_id"]  # самое большое фото

        r2 = client.get(f"{base}/getFile", params={"file_id": file_id})
        r2.raise_for_status()
        data2 = r2.json()
        if not data2.get("ok"):
            return None

        file_path = data2["result"]["file_path"]
        file_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"

    # качаем файл отдельным запросом (можно тем же client, но так проще)
    return _download_url_bytes(file_url)


def sync_user_avatar_if_needed(user) -> bool:
    """
    Возвращает True если аватар обновили и user изменился.
    Обновляем не чаще чем раз в 24 часа.
    """
    if not getattr(user, "telegram_id", None):
        return False

    updated_at = getattr(user, "avatar_updated_at", None)
    if updated_at and updated_at > datetime.utcnow() - timedelta(hours=24):
        return False

    try:
        content = _download_avatar_via_bot(int(user.telegram_id))
        if not content:
            return False
        avatar_url = _save_avatar_bytes(int(user.id), content, ext="jpg")
        user.avatar_url = avatar_url
        user.avatar_updated_at = datetime.utcnow()
        return True
    except Exception:
        # не ломаем профиль из-за аватара
        return False
