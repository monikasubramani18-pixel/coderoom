"""WebSocket endpoint: live code sync, presence, chat, shared question and timer.

Client -> server messages (JSON, `type` field):
    code      {code, language}                anyone
    chat      {text}                          anyone
    question  {text}                          host only
    title     {title}                         host only
    timer     {action: start|pause|reset, minutes?}   host only
"""
import json
import logging
import time
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

import models
from auth import get_user_from_token
from database import SessionLocal
from realtime import MAX_CHAT_HISTORY, Peer, RoomState, hub
from sandbox import MAX_CODE_CHARS, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)
router = APIRouter()

CLOSE_UNAUTHORIZED = 4401
CLOSE_ROOM_NOT_FOUND = 4404

MAX_MESSAGE_CHARS = 120_000
MAX_CHAT_CHARS = 500
MAX_QUESTION_CHARS = 5_000
MAX_TITLE_CHARS = 80


async def handle_message(room_id: str, state: RoomState, peer: Peer, message: dict) -> None:
    kind = message.get("type")
    is_host = peer.user_id == state.owner_id

    if kind == "code":
        code, language = message.get("code"), message.get("language")
        if not isinstance(code, str) or len(code) > MAX_CODE_CHARS or language not in SUPPORTED_LANGUAGES:
            return
        state.code, state.language = code, language
        await hub.broadcast(room_id, {"type": "code", "code": code, "language": language}, exclude=peer.ws)
        hub.schedule_save(room_id)

    elif kind == "chat":
        text = message.get("text")
        if not isinstance(text, str) or not text.strip():
            return
        entry = {
            "id": uuid.uuid4().hex[:8],
            "user_id": peer.user_id,
            "user": peer.username,
            "text": text.strip()[:MAX_CHAT_CHARS],
            "ts": int(time.time() * 1000),
        }
        state.chat.append(entry)
        del state.chat[:-MAX_CHAT_HISTORY]
        await hub.broadcast(room_id, {"type": "chat", "message": entry})

    elif kind == "question" and is_host:
        text = message.get("text")
        if not isinstance(text, str) or len(text) > MAX_QUESTION_CHARS:
            return
        state.question = text
        await hub.broadcast(room_id, {"type": "question", "text": text}, exclude=peer.ws)
        hub.schedule_save(room_id)

    elif kind == "title" and is_host:
        title = message.get("title")
        if not isinstance(title, str):
            return
        state.title = title.strip()[:MAX_TITLE_CHARS] or "Untitled room"
        await hub.broadcast(room_id, {"type": "title", "title": state.title}, exclude=peer.ws)
        hub.schedule_save(room_id)

    elif kind == "timer" and is_host:
        action = message.get("action")
        if action == "start":
            state.timer.start()
        elif action == "pause":
            state.timer.pause()
        elif action == "reset":
            minutes = message.get("minutes")
            valid = isinstance(minutes, int) and not isinstance(minutes, bool) and 1 <= minutes <= 180
            state.timer.reset(minutes if valid else None)
        else:
            return
        await hub.broadcast(room_id, {"type": "timer", **state.timer.snapshot()})


@router.websocket("/ws/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str, token: str | None = Query(default=None)):
    # Read everything needed from the database up front so no session stays open
    # for the (potentially long) lifetime of the connection.
    user_info = None
    room_data = None
    with SessionLocal() as db:
        user = get_user_from_token(token, db)
        if user:
            user_info = (user.id, user.username)
            room = db.get(models.Room, room_id)
            owner = db.get(models.User, room.owner_id) if room else None
            if room and owner:
                room_data = {
                    "title": room.title,
                    "code": room.code,
                    "language": room.language,
                    "question": room.question,
                    "owner_id": room.owner_id,
                    "owner_name": owner.username,
                }

    await websocket.accept()
    if user_info is None:
        await websocket.close(code=CLOSE_UNAUTHORIZED)
        return
    if room_data is None:
        await websocket.close(code=CLOSE_ROOM_NOT_FOUND)
        return

    user_id, username = user_info
    state = hub.states.setdefault(room_id, RoomState(**room_data))
    peer = Peer(ws=websocket, user_id=user_id, username=username)
    hub.add_peer(room_id, peer)

    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "init",
                    "you": {"id": user_id, "username": username, "is_host": user_id == state.owner_id},
                    "room": {
                        "id": room_id,
                        "title": state.title,
                        "owner": state.owner_name,
                        "code": state.code,
                        "language": state.language,
                        "question": state.question,
                    },
                    "chat": state.chat,
                    "timer": state.timer.snapshot(),
                    "users": hub.online_users(room_id),
                }
            )
        )
        await hub.broadcast_presence(room_id)

        while True:
            raw = await websocket.receive_text()
            if len(raw) > MAX_MESSAGE_CHARS:
                continue
            try:
                message = json.loads(raw)
            except ValueError:
                continue
            if isinstance(message, dict):
                await handle_message(room_id, state, peer, message)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.remove_peer(room_id, peer)
