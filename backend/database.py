"""Database engine, session factory and lightweight schema migrations."""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it to backend/.env")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_lightweight_migrations() -> None:
    """Add columns introduced after the first release.

    `create_all` only creates missing tables, never missing columns.
    Replace this with Alembic migrations once the schema starts changing often.
    """
    statements = [
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS title VARCHAR(80) NOT NULL DEFAULT 'Untitled room'",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
