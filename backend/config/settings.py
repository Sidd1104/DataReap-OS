"""
AI Data Enrichment Platform — Application Settings
Loads all configuration from environment variables using Pydantic Settings.
No secrets are ever hardcoded.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────
    app_name: str = "AI Data Enrichment Platform"
    app_env: Literal["development", "production"] = "development"
    app_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    secret_key: str = "change_me_in_production"

    # ── Database ─────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./data/enrichment.db"

    # ── AI Providers ─────────────────────────────────────────
    default_llm_provider: Literal["gemini", "openai", "anthropic"] = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # ── Search APIs ──────────────────────────────────────────
    google_search_api_key: str = ""
    google_search_engine_id: str = ""

    # ── Worker Engine ─────────────────────────────────────────
    default_concurrency: int = 5
    default_retries: int = 3
    default_timeout_seconds: int = 30
    worker_poll_interval: float = 1.0

    # ── Encryption ───────────────────────────────────────────
    encryption_key: str = ""

    # ── Notifications ─────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    notify_email: str = ""

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    discord_webhook_url: str = ""

    slack_bot_token: str = ""
    slack_channel: str = "#enrichment-alerts"

    # ── Scheduler ────────────────────────────────────────────
    scheduler_enabled: bool = True
    watch_folder: str = "./uploads"
    scheduler_timezone: str = "UTC"

    # ── Browser Module ────────────────────────────────────────
    browser_mode_enabled: bool = False
    browser_headless: bool = True
    browser_screenshots_dir: str = "./screenshots"

    # ── Logging ──────────────────────────────────────────────
    log_level: str = "INFO"
    log_file: str = "./logs/platform.log"

    @field_validator("database_url")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        allowed_prefixes = (
            "sqlite+aiosqlite://",
            "postgresql+asyncpg://",
            "mysql+aiomysql://",
        )
        if not any(v.startswith(p) for p in allowed_prefixes):
            raise ValueError(
                f"DATABASE_URL must start with one of: {allowed_prefixes}"
            )
        return v

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def data_dir(self) -> Path:
        return Path("./data")

    @property
    def uploads_dir(self) -> Path:
        return Path(self.watch_folder)

    @property
    def logs_dir(self) -> Path:
        return Path(self.log_file).parent

    @property
    def screenshots_dir(self) -> Path:
        return Path(self.browser_screenshots_dir)

    def ensure_directories(self) -> None:
        """Create all required directories if they don't exist."""
        for d in [self.data_dir, self.uploads_dir, self.logs_dir, self.screenshots_dir]:
            d.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Return cached singleton Settings instance."""
    settings = Settings()
    settings.ensure_directories()
    return settings
