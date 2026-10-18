from __future__ import annotations

import os
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

    # ── Application ────────────────────────────────────────────
    app_env: Literal["development", "production", "test"] = "development"
    secret_key: str = "change-me"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # ── Database ───────────────────────────────────────────────
    database_url: str = "sqlite:///./jobpilot.db"

    # ── Ollama ─────────────────────────────────────────────────
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:8b"
    ollama_timeout: int = 120

    # ── Adzuna ─────────────────────────────────────────────────
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_country: str = "id"

    # ── Gmail OAuth ────────────────────────────────────────────
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_redirect_uri: str = "http://localhost:8000/api/v1/auth/gmail/callback"

    # ── File Storage ───────────────────────────────────────────
    cv_output_dir: str = "generated_cvs"

    @property
    def cv_output_path(self) -> Path:
        base = Path(__file__).parent.parent
        p = base / self.cv_output_dir
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def adzuna_configured(self) -> bool:
        return bool(self.adzuna_app_id and self.adzuna_app_key)

    @property
    def gmail_configured(self) -> bool:
        return bool(self.gmail_client_id and self.gmail_client_secret)

    @property
    def email_send_enabled(self) -> bool:
        return self.gmail_configured and self.app_env != "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
