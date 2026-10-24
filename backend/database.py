"""Database engine, session factory and lightweight schema migrations."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
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
    if engine.dialect.name != "postgresql":  # `ADD COLUMN IF NOT EXISTS` is PostgreSQL syntax
        return
    statements = [
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS title VARCHAR(80) NOT NULL DEFAULT 'Untitled room'",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS problem_id VARCHAR(40)",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
