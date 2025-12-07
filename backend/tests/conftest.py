# tests/conftest.py

import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))      # .../WorkScoutRubot/backend
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_ROOT, ".."))     # .../WorkScoutRubot

for path in (BACKEND_ROOT, PROJECT_ROOT):
    if path not in sys.path:
        sys.path.insert(0, path)



import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.api.deps import get_db
from app.models.user import User
from app.main import app  # ТВОЙ FastAPI-приложение лежит в app/main.py

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ===== фикстуры юзеров =====

@pytest.fixture()
def customer(db_session) -> User:
    user = User(
        role="customer",
        first_name="Клиент",
        last_name="Тестовый",
        phone="+79990000001",
        city="Москва",
        about=None,
        specializations_raw="",
        company_name=None,
        about_orders=None,
        telegram_id=111111111,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def executor(db_session) -> User:
    user = User(
        role="executor",
        first_name="Исполнитель",
        last_name="Тестовый",
        phone="+79990000002",
        city="Москва",
        about="Опытный мастер",
        # БЫЛО:
        # specializations_raw="электрика,сантехника",
        # СТАЛО — пересекается с ["отделка", "плитка"]:
        specializations_raw="отделка,плитка",
        company_name=None,
        about_orders=None,
        telegram_id=222222222,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user



@pytest.fixture()
def admin(db_session) -> User:
    user = User(
        role="admin",
        first_name="Админ",
        last_name="Системы",
        phone="+79990000003",
        city="Москва",
        about=None,
        specializations_raw="",
        company_name=None,
        about_orders=None,
        telegram_id=333333333,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
