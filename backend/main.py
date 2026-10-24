"""CodeRoom API: real-time collaborative coding and mock-interview platform."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

import models  # noqa: F401  (imported so the tables are registered on Base)
from config import settings
from database import Base, engine, run_lightweight_migrations
from routers import auth_routes, progress, rooms, run, ws

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_lightweight_migrations()
    yield


app = FastAPI(title="CodeRoom API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_urls),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(rooms.router)
app.include_router(progress.router)
app.include_router(run.router)
app.include_router(ws.router)


@app.get("/health", tags=["meta"])
def health():
    """Liveness and database readiness probe."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok"}
