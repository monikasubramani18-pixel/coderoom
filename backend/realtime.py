"""In-memory state for active rooms: connections, live code, chat and the interview timer.

Live state stays in memory for speed and is persisted to PostgreSQL with a debounce.
This design assumes a single server process; use Redis pub/sub to scale horizontally.
"""
import asyncio
import json
import logging
import time
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import WebSocket
from starlette.concurrency import run_in_threadpool

import models
from database import SessionLocal
from events import MAX_SNAPSHOT_CHARS, record_event

logger = logging.getLogger(__name__)

SAVE_DELAY_SECONDS = 1.5
SNAPSHOT_MIN_INTERVAL_SECONDS = 3.0  # at most one code snapshot per room every few seconds while typing
MAX_CHAT_HISTORY = 50
DEFAULT_TIMER_SECONDS = 45 * 60


class Timer:
    """Countdown timer owned by the server so every participant sees the same time."""

    def __init__(self, duration: int = DEFAULT_TIMER_SECONDS):
        self.duration = duration
        self.remaining = float(duration)
        self.ends_at: float | None = None  # epoch seconds while running

    @property
    def running(self) -> bool:
        return self.ends_at is not None

    def _sync(self) -> None:
        if self.ends_at is None:
            return
        left = self.ends_at - time.time()
        if left <= 0:
            self.remaining, self.ends_at = 0.0, None
        else:
            self.remaining = left

    def start(self) -> None:
        self._sync()
        if not self.running and self.remaining > 0:
            self.ends_at = time.time() + self.remaining

    def pause(self) -> None:
        self._sync()
        self.ends_at = None

    def reset(self, minutes: int | None = None) -> None:
        if minutes:
            self.duration = minutes * 60
        self.remaining, self.ends_at = float(self.duration), None

    def snapshot(self) -> dict:
        self._sync()
        return {
            "running": self.running,
            "remaining": int(round(self.remaining)),
            "duration": int(self.duration),
        }


@dataclass
class RoomState:
    title: str
    code: str
    language: str
    question: str
    owner_id: int
    owner_name: str
    problem_id: str | None = None
    chat: list[dict] = field(default_factory=list)
    timer: Timer = field(default_factory=Timer)


@dataclass(eq=False)
class Peer:
    ws: WebSocket
    user_id: int
    username: str
    camera: bool = False  # camera is on and the user opted in to video
    attention: str | None = None  # shared attention status, only while the camera is on
    flow: str | None = None  # coding pulse (flow, thinking, debugging, stuck, ...), computed on the user's device


def persist_room(room_id: str, state: RoomState) -> None:
    with SessionLocal() as db:
        room = db.get(models.Room, room_id)
        if room is None:
            return
        room.title = state.title
        room.code = state.code
        room.language = state.language
        room.question = state.question
        room.problem_id = state.problem_id
        room.updated_at = models.utcnow()
        db.commit()


class RoomHub:
    def __init__(self) -> None:
        self.peers: dict[str, list[Peer]] = defaultdict(list)
        self.states: dict[str, RoomState] = {}
        self._save_tasks: dict[str, asyncio.Task] = {}
        self._last_snapshot: dict[str, tuple[float, str, str]] = {}  # room -> (time, code, language)

    # ----- queries -----
    def is_active(self, room_id: str) -> bool:
        return bool(self.peers.get(room_id))

    def has_user(self, room_id: str, user_id: int) -> bool:
        return any(peer.user_id == user_id for peer in self.peers.get(room_id, []))

    def online_users(self, room_id: str, viewer_id: int | None = None) -> list[dict]:
        """Who is in the room. With `viewer_id`, the coding pulse is shown only to the host and to the person themselves."""
        state = self.states.get(room_id)
        owner_id = state.owner_id if state else None
        users: dict[int, dict] = {}
        for peer in self.peers.get(room_id, []):
            entry = users.get(peer.user_id)  # same user in several tabs counts once
            if entry is None:
                users[peer.user_id] = {
                    "id": peer.user_id,
                    "username": peer.username,
                    "is_host": peer.user_id == owner_id,
                    "camera": peer.camera,
                    "attention": peer.attention if peer.camera else None,
                    "flow": peer.flow,
                }
            elif peer.camera and not entry["camera"]:
                entry["camera"], entry["attention"] = True, peer.attention
            if entry is not None and peer.flow and not entry["flow"]:
                entry["flow"] = peer.flow
        if viewer_id is not None and viewer_id != owner_id:
            for entry in users.values():
                if entry["id"] != viewer_id:
                    entry["flow"] = None
        return list(users.values())

    # ----- messaging -----
    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket | None = None) -> None:
        data = json.dumps(message)
        for peer in list(self.peers.get(room_id, [])):
            if peer.ws is exclude:
                continue
            try:
                await peer.ws.send_text(data)
            except Exception:  # the socket is closing; its own handler cleans up
                logger.debug("Could not deliver message to %s", peer.username, exc_info=True)

    async def send_to_user(self, room_id: str, user_id: int, message: dict) -> None:
        """Deliver a message to every open connection of one user in a room."""
        data = json.dumps(message)
        for peer in list(self.peers.get(room_id, [])):
            if peer.user_id != user_id:
                continue
            try:
                await peer.ws.send_text(data)
            except Exception:  # the socket is closing; its own handler cleans up
                logger.debug("Could not deliver message to %s", peer.username, exc_info=True)

    async def broadcast_presence(self, room_id: str) -> None:
        """Each person gets their own view of the presence list (the pulse is private to the host and the owner)."""
        for peer in list(self.peers.get(room_id, [])):
            message = {"type": "presence", "users": self.online_users(room_id, viewer_id=peer.user_id)}
            try:
                await peer.ws.send_text(json.dumps(message))
            except Exception:  # the socket is closing; its own handler cleans up
                logger.debug("Could not deliver presence to %s", peer.username, exc_info=True)

    # ----- lifecycle -----
    def add_peer(self, room_id: str, peer: Peer) -> None:
        self.peers[room_id].append(peer)

    async def remove_peer(self, room_id: str, peer: Peer) -> None:
        peers = self.peers.get(room_id, [])
        if peer in peers:
            peers.remove(peer)
        if peers:
            await self.broadcast_presence(room_id)
            return

        # Last participant left: flush to the database and release memory.
        self.peers.pop(room_id, None)
        task = self._save_tasks.pop(room_id, None)
        if task:
            task.cancel()
        state = self.states.get(room_id)
        if state:
            await run_in_threadpool(persist_room, room_id, state)
            await self.snapshot_code(room_id, force=True)
        if not self.peers.get(room_id):  # nobody rejoined while saving
            self.states.pop(room_id, None)
            self._last_snapshot.pop(room_id, None)

    # ----- session replay -----
    async def snapshot_code(self, room_id: str, user_id: int | None = None, force: bool = False) -> None:
        """Record the current code for replay. Unchanged code is skipped; typing is throttled unless `force`."""
        state = self.states.get(room_id)
        if state is None or len(state.code) > MAX_SNAPSHOT_CHARS:
            return
        last = self._last_snapshot.get(room_id)
        if last and last[1] == state.code and last[2] == state.language:
            return
        now = time.monotonic()
        if not force and last and now - last[0] < SNAPSHOT_MIN_INTERVAL_SECONDS:
            return
        self._last_snapshot[room_id] = (now, state.code, state.language)
        payload = {"code": state.code, "language": state.language}
        await run_in_threadpool(record_event, room_id, "code", payload, user_id)

    # ----- debounced persistence -----
    def schedule_save(self, room_id: str) -> None:
        task = self._save_tasks.get(room_id)
        if task:
            task.cancel()
        self._save_tasks[room_id] = asyncio.create_task(self._save_later(room_id))

    async def _save_later(self, room_id: str) -> None:
        await asyncio.sleep(SAVE_DELAY_SECONDS)
        state = self.states.get(room_id)
        if state:
            await run_in_threadpool(persist_room, room_id, state)
            await self.snapshot_code(room_id, force=True)  # typing paused: capture where the burst ended


hub = RoomHub()
