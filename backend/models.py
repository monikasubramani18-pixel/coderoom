from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from database import Base


def utcnow():
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

    id = Column(String(16), primary_key=True)  # random short code (URL la varum)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(Text, nullable=False, default="")
    language = Column(String(20), nullable=False, default="python")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow)