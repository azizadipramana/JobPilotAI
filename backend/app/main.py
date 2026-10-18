from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    applications,
    auth,
    drafts,
    health,
    jobs,
    llm,
    profiles,
    workflows,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"[START] JobPilot AI backend starting — env={settings.app_env}")
    try:
        from app.database import Base, engine
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        print("[DB] Database tables verified/initialized")
    except Exception as e:
        print(f"[WARN] Database initialization warning: {e}")
    yield
    print("[SHUTDOWN] JobPilot AI backend shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="JobPilot AI",
        description="Local multi-agent job application assistant",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api/v1"
    app.include_router(health.router, prefix=prefix, tags=["health"])
    app.include_router(llm.router, prefix=prefix, tags=["llm"])
    app.include_router(profiles.router, prefix=prefix, tags=["profiles"])
    app.include_router(jobs.router, prefix=prefix, tags=["jobs"])
    app.include_router(workflows.router, prefix=prefix, tags=["workflows"])
    app.include_router(drafts.router, prefix=prefix, tags=["drafts"])
    app.include_router(applications.router, prefix=prefix, tags=["applications"])
    app.include_router(auth.router, prefix=prefix, tags=["auth"])

    return app


app = create_app()
