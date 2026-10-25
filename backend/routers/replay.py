"""Session replay: the recorded timeline of a room."""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db
from events import MAX_EVENTS_PER_ROOM

router = APIRouter(tags=["replay"])


@router.get("/rooms/{room_id}/replay")
def get_replay(room_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Events in order, with `t` = milliseconds since the first event. Host and participants only."""
    room = db.get(models.Room, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    events = (
        db.query(models.RoomEvent)
        .filter(models.RoomEvent.room_id == room_id)
        .order_by(models.RoomEvent.created_at, models.RoomEvent.id)
        .limit(MAX_EVENTS_PER_ROOM)
        .all()
    )
    took_part = any(event.user_id == user.id for event in events)
    if room.owner_id != user.id and not took_part:
        raise HTTPException(status_code=403, detail="Only the host and participants can replay this session")

    user_ids = {event.user_id for event in events if event.user_id is not None}
    names = {}
    if user_ids:
        names = {u.id: u.username for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}

    started = events[0].created_at if events else None
    return {
        "room": {"id": room.id, "title": room.title, "problem_id": room.problem_id},
        "started_at": started.isoformat() if started else None,
        "events": [
            {
                "id": event.id,
                "t": int((event.created_at - started).total_seconds() * 1000),
                "kind": event.kind,
                "user": names.get(event.user_id),
                "data": json.loads(event.payload),
            }
            for event in events
        ],
    }
