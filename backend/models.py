"""SQLAlchemy models."""
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(30), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(16), primary_key=True)  # short random code used in room URLs
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(80), nullable=False, default="Untitled room")
    code = Column(Text, nullable=False, default="")
    language = Column(String(20), nullable=False, default="python")
    question = Column(Text, nullable=False, default="")  # problem statement shown to everyone
    problem_id = Column(String(40), nullable=True)  # id from the frontend problem library
    notes = Column(Text, nullable=False, default="")  # private to the host
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (UniqueConstraint("room_id", "author_id", name="uq_feedback_room_author"),)

    id = Column(Integer, primary_key=True)
    room_id = Column(String(16), ForeignKey("rooms.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow)


class Submission(Base):
    """One "run tests" attempt on a library problem; used for the progress dashboard."""

    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    problem_id = Column(String(40), nullable=False, index=True)
    language = Column(String(20), nullable=False)
    passed_cases = Column(Integer, nullable=False)
    total_cases = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
