"""In-memory state for active rooms: connections, live code, chat and the interview timer.

Live state stays in memory for speed and is persisted to PostgreSQL with a debounce.
This design assumes a single server process; use Redis pub/sub to scale horizontally.
"""
import asyncio
import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import WebSocket
from starlette.concurrency import run_in_threadpool

import models
from database import SessionLocal

logger = logging.getLogger(__name__)

SAVE_DELAY_SECONDS = 1.5
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

    # ----- queries -----
    def is_active(self, room_id: str) -> bool:
        return bool(self.peers.get(room_id))

    def has_user(self, room_id: str, user_id: int) -> bool:
        return any(peer.user_id == user_id for peer in self.peers.get(room_id, []))

    def online_users(self, room_id: str) -> list[dict]:
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
                }
            elif peer.camera and not entry["camera"]:
                entry["camera"], entry["attention"] = True, peer.attention
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
        await self.broadcast(room_id, {"type": "presence", "users": self.online_users(room_id)})

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
        if not self.peers.get(room_id):  # nobody rejoined while saving
            self.states.pop(room_id, None)

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


hub = RoomHub()
