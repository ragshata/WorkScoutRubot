# app/db/base.py

from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Импорт моделей, чтобы Alembic/metadata их видел
from app.models.user import User  # noqa
from app.models.order import Order  # noqa
from app.models.response import Response  # noqa
from app.models.chat import Chat  # noqa
from app.models.review import Review  # noqa
from app.models.support_ticket import SupportTicket  # noqa