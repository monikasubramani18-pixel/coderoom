"""CodeRoom API: real-time collaborative coding and mock-interview platform."""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (imported so the tables are registered on Base)
from database import Base, engine, run_lightweight_migrations
from routers import auth_routes, rooms, run, ws

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

Base.metadata.create_all(bind=engine)
run_lightweight_migrations()

# Comma-separated list, e.g. FRONTEND_URLS=https://coderoom.netlify.app
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_URLS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app = FastAPI(title="CodeRoom API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(rooms.router)
app.include_router(run.router)
app.include_router(ws.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
