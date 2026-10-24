"""Room management, private host notes and feedback."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db
from realtime import hub
from sandbox import SUPPORTED_LANGUAGES
from schemas import CreateRoomRequest, FeedbackIn, NotesUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])

DEFAULT_CODE = 'print("Hello, CodeRoom!")\n'  # keep in sync with the frontend python template


def get_room_or_404(db: Session, room_id: str) -> models.Room:
    room = db.get(models.Room, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def get_owned_room(db: Session, room_id: str, user: models.User) -> models.Room:
    room = get_room_or_404(db, room_id)
    if room.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the room host can do this")
    return room


@router.post("", status_code=201)
def create_room(
    payload: CreateRoomRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")
    room = models.Room(
        id=secrets.token_hex(4),
        owner_id=user.id,
        title=payload.title.strip() or "Untitled room",
        code=DEFAULT_CODE if payload.code is None else payload.code,
        language=payload.language,
        question=payload.question,
        problem_id=payload.problem_id,
    )
    db.add(room)
    db.commit()
    return {"id": room.id, "title": room.title}


@router.get("")
def list_my_rooms(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rooms = (
        db.query(models.Room)
        .filter(models.Room.owner_id == user.id)
        .order_by(models.Room.updated_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": room.id,
            "title": room.title,
            "language": room.language,
            "problem_id": room.problem_id,
            "updated_at": room.updated_at.isoformat() if room.updated_at else None,
            "active": hub.is_active(room.id),
        }
        for room in rooms
    ]


@router.delete("/{room_id}", status_code=204)
def delete_room(
    room_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = get_owned_room(db, room_id, user)
    if hub.is_active(room_id):
        raise HTTPException(status_code=409, detail="Room is in use right now. Try again once everyone has left.")
    db.query(models.Feedback).filter(models.Feedback.room_id == room_id).delete()
    db.delete(room)
    db.commit()


# ----- private host notes -----
@router.get("/{room_id}/notes")
def get_notes(
    room_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"notes": get_owned_room(db, room_id, user).notes}


@router.put("/{room_id}/notes")
def save_notes(
    room_id: str,
    payload: NotesUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = get_owned_room(db, room_id, user)
    room.notes = payload.notes
    db.commit()
    return {"ok": True}


# ----- feedback -----
def serialize_feedback(feedback: models.Feedback, author: str) -> dict:
    return {
        "id": feedback.id,
        "author_id": feedback.author_id,
        "author": author,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "updated_at": feedback.updated_at.isoformat() if feedback.updated_at else None,
    }


@router.get("/{room_id}/feedback")
def list_feedback(
    room_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_room_or_404(db, room_id)
    rows = (
        db.query(models.Feedback, models.User.username)
        .join(models.User, models.User.id == models.Feedback.author_id)
        .filter(models.Feedback.room_id == room_id)
        .order_by(models.Feedback.updated_at.desc())
        .all()
    )
    return [serialize_feedback(feedback, author) for feedback, author in rows]


@router.put("/{room_id}/feedback")
def submit_feedback(
    room_id: str,
    payload: FeedbackIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update the current user's feedback for this room."""
    get_room_or_404(db, room_id)
    feedback = (
        db.query(models.Feedback)
        .filter(models.Feedback.room_id == room_id, models.Feedback.author_id == user.id)
        .first()
    )
    if feedback is None:
        feedback = models.Feedback(room_id=room_id, author_id=user.id)
        db.add(feedback)
    feedback.rating = payload.rating
    feedback.comment = payload.comment.strip()
    feedback.updated_at = models.utcnow()
    db.commit()
    db.refresh(feedback)
    return serialize_feedback(feedback, user.username)
