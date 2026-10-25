"""Records a timeline of what happens in a room so a session can be replayed later."""
import json
import logging

from sqlalchemy import func

import models
from database import SessionLocal

logger = logging.getLogger(__name__)

MAX_EVENTS_PER_ROOM = 3_000  # keeps storage bounded for very long sessions
MAX_SNAPSHOT_CHARS = 20_000  # larger code snapshots are skipped


def record_event(room_id: str, kind: str, payload: dict, user_id: int | None = None) -> None:
    """Best effort: a failure here is logged and must never break the live session."""
    try:
        with SessionLocal() as db:
            stored = (
                db.query(func.count(models.RoomEvent.id)).filter(models.RoomEvent.room_id == room_id).scalar()
            )
            if stored >= MAX_EVENTS_PER_ROOM:
                return
            db.add(
                models.RoomEvent(room_id=room_id, user_id=user_id, kind=kind, payload=json.dumps(payload))
            )
            db.commit()
    except Exception:
        logger.exception("Could not record %s event for room %s", kind, room_id)
