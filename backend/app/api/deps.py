# app/api/deps.py
import os
import json
import time
import hmac
import hashlib
from typing import Generator, Optional, Dict, Any, List, Tuple
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User

# Сколько секунд считаем Telegram initData "свежим" (защита от реюза).
# Можно переопределить в backend/.env:
# TG_INITDATA_MAX_AGE_SECONDS=86400
TG_INITDATA_MAX_AGE_SECONDS = int(os.getenv("TG_INITDATA_MAX_AGE_SECONDS", "86400"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _parse_init_data(init_data: str) -> Dict[str, str]:
    # Telegram WebApp initData приходит как querystring: key=value&key2=value2
    pairs: List[Tuple[str, str]] = parse_qsl(init_data, keep_blank_values=True)
    return {k: v for k, v in pairs}


def _build_data_check_string(data: Dict[str, str]) -> str:
    # По докам Telegram: берём все поля, кроме hash, сортируем по ключу,
    # соединяем строкой "key=value" через \n
    items = [(k, v) for k, v in data.items() if k != "hash"]
    items.sort(key=lambda x: x[0])
    return "\n".join([f"{k}={v}" for k, v in items])


def _verify_telegram_init_data(init_data: str, bot_token: str) -> Dict[str, str]:
    data = _parse_init_data(init_data)

    recv_hash = data.get("hash")
    if not recv_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_INVALID_SIGNATURE",
        )

    # Проверка свежести (auth_date в секундах)
    auth_date_str = data.get("auth_date")
    if auth_date_str:
        try:
            auth_date = int(auth_date_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="USER_INVALID_SIGNATURE",
            )

        now = int(time.time())
        if TG_INITDATA_MAX_AGE_SECONDS > 0 and auth_date < now - TG_INITDATA_MAX_AGE_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="USER_INITDATA_EXPIRED",
            )

    data_check_string = _build_data_check_string(data)

    # Секретный ключ по Telegram: HMAC_SHA256(bot_token, "WebAppData")
    secret_key = hmac.new(
        key=bot_token.encode("utf-8"),
        msg=b"WebAppData",
        digestmod=hashlib.sha256,
    ).digest()

    # Проверочная подпись: HMAC_SHA256(data_check_string, secret_key)
    calc_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calc_hash, recv_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_INVALID_SIGNATURE",
        )

    return data


def get_current_user(
    db: Session = Depends(get_db),
    x_tg_init_data: Optional[str] = Header(default=None, alias="X-Tg-Init-Data"),
) -> User:
    """
    Прод-логика (Telegram Mini App):

    - нет X-Tg-Init-Data -> 401 USER_NOT_AUTHENTICATED
    - подпись невалидна -> 401 USER_INVALID_SIGNATURE
    - initData протух -> 401 USER_INITDATA_EXPIRED
    - пользователя нет в БД -> 401 USER_NOT_FOUND (сначала /auth/register)
    - is_blocked == True -> 403 "Пользователь заблокирован"
    """

    if not x_tg_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_AUTHENTICATED",
        )

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not bot_token:
        # Это конфиг-ошибка сервера: без токена нельзя проверить подпись
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SERVER_MISCONFIG_TELEGRAM_BOT_TOKEN",
        )

    data = _verify_telegram_init_data(x_tg_init_data, bot_token)

    user_json = data.get("user")
    if not user_json:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_AUTHENTICATED",
        )

    try:
        user_obj: Dict[str, Any] = json.loads(user_json)
        telegram_id = int(user_obj["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_AUTHENTICATED",
        )

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_FOUND",
        )

    if getattr(user, "is_blocked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    return user


def require_role(*roles: str):
    def dependency(current: User = Depends(get_current_user)) -> User:
        if current.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Нужна роль: {roles}",
            )
        return current

    return dependency
