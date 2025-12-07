# app/core/config.py

from pydantic import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "WorkScout API"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./app.db"

    class Config:
        env_file = ".env"


settings = Settings()
