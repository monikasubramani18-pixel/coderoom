"""Request payloads."""
from pydantic import BaseModel, Field

from sandbox import MAX_CODE_CHARS, MAX_STDIN_CHARS


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=72)  # bcrypt ignores bytes beyond 72


class LoginRequest(BaseModel):
    username: str  # username or email
    password: str = Field(max_length=72)


class CreateRoomRequest(BaseModel):
    title: str = Field(default="Untitled room", min_length=1, max_length=80)


class NotesUpdate(BaseModel):
    notes: str = Field(max_length=20_000)


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2_000)


class RunRequest(BaseModel):
    language: str
    code: str = Field(max_length=MAX_CODE_CHARS)
    stdin: str = Field(default="", max_length=MAX_STDIN_CHARS)
    room_id: str | None = None  # when set, the result is broadcast to the room
