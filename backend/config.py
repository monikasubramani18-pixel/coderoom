"""Application settings loaded from environment variables (backend/.env in development)."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is not set. Add it to backend/.env (see .env.example).")
    return value


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    # Origins allowed by CORS, e.g. FRONTEND_URLS=https://coderoom.netlify.app
    frontend_urls: tuple[str, ...]
    token_lifetime_hours: int = 24
    # Optional: enables the AI assistant. Without a key the feature stays switched off.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-haiku-5-5"


def load_settings() -> Settings:
    origins = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://127.0.0.1:5173")
    return Settings(
        database_url=_require("DATABASE_URL"),
        secret_key=_require("SECRET_KEY"),
        frontend_urls=tuple(o.strip() for o in origins.split(",") if o.strip()),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY") or None,
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5"),
    )


settings = load_settings()
