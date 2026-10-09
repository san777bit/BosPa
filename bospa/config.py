from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    bot_token: str
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = "sqlite+aiosqlite:///bospa.db"
    routes_file: Path = Path("data/routes.yaml")

    # Публичный HTTPS-адрес Mini App (например, https://bospa.example.kz/app/).
    # Пока не задан, кнопка карты в боте не показывается.
    webapp_url: str | None = None
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    # Только для локальной разработки: пропускать проверку Telegram initData.
    api_dev_no_auth: bool = False
    map_style_url: str = "https://tiles.openfreemap.org/styles/liberty"

    fusion_interval_s: float = 3.0
