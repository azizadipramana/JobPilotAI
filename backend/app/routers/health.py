from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()


@router.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "env": settings.app_env,
        "ollama_url": settings.ollama_base_url,
        "adzuna_configured": settings.adzuna_configured,
        "gmail_configured": settings.gmail_configured,
        "email_send_enabled": settings.email_send_enabled,
    }


@router.get("/health/db")
async def health_db():
    from app.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
