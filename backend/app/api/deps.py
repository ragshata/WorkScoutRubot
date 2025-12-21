# app/api/deps.py
import hmac
import hashlib
import json
import time
from typing import Generator, Optional
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User

INITDATA_TTL_SECONDS = 60 * 60 * 24  # 24 часа


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _verify_and_extract_tg_user_id(init_data: str, bot_token: str) -> int:
    """
    Telegram WebApp initData verification:
    - parse querystring
    - build data_check_string (sorted, without 'hash')
    - secret_key = HMAC_SHA256("WebAppData", bot_token)
    - check hash = HMAC_SHA256(secret_key, data_check_string)
    - optionally check auth_date freshness
    - extract user.id from 'user' JSON
    """
    if not init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_AUTHENTICATED")

    if not bot_token:
        # если на сервере не настроили токен, подпись никогда не пройдёт
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="SERVER_TELEGRAM_TOKEN_MISSING")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.get("hash", "")
    if not received_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_INVALID_SIGNATURE")

    # expiry check
    auth_date = pairs.get("auth_date")
    if auth_date:
        try:
            auth_ts = int(auth_date)
            if int(time.time()) - auth_ts > INITDATA_TTL_SECONDS:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_INITDATA_EXPIRED")
        except ValueError:
            pass

    data_check_items = []
    for k in sorted(pairs.keys()):
        if k == "hash":
            continue
        data_check_items.append(f"{k}={pairs[k]}")
    data_check_string = "\n".join(data_check_items)

    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_INVALID_SIGNATURE")

    user_raw = pairs.get("user")
    if not user_raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_AUTHENTICATED")

    try:
        user_obj = json.loads(user_raw)
        tg_user_id = int(user_obj["id"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_AUTHENTICATED")

    return tg_user_id


def get_current_user(
    db: Session = Depends(get_db),
    x_tg_init_data: Optional[str] = Header(default=None, alias="X-Tg-Init-Data"),
) -> User:
    bot_token = (  # берем из окружения через стандартный способ
        __import__("os").getenv("TELEGRAM_BOT_TOKEN", "")
    )

    tg_user_id = _verify_and_extract_tg_user_id(x_tg_init_data or "", bot_token)

    user = db.query(User).filter(User.telegram_id == tg_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_FOUND")

    if getattr(user, "is_blocked", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь заблокирован")

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
