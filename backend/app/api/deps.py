# app/api/deps.py

from typing import Generator, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def get_current_user(
  db: Session = Depends(get_db),
  x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> User:
  """
  Общая логика:

  - нет X-User-Id -> 401 USER_NOT_AUTHENTICATED
  - не смогли распарсить id / юзер не найден -> 401 USER_NOT_FOUND
  - is_blocked == True -> 403 "Пользователь заблокирован"
  """
  # вообще нет заголовка -> гость
  if x_user_id is None:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="USER_NOT_AUTHENTICATED",
    )

  # кривой id в заголовке -> считаем, что юзер "не найден"
  try:
    user_id = int(x_user_id)
  except ValueError:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="USER_NOT_FOUND",
    )

  user = db.query(User).filter(User.id == user_id).first()
  if not user:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="USER_NOT_FOUND",
    )

  # блокировка
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
