"""Code execution endpoint with a per-user rate limit."""
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

import models
import sandbox
from auth import get_current_user
from realtime import hub
from schemas import RunRequest

router = APIRouter(tags=["execution"])

RUNS_PER_WINDOW = 10
WINDOW_SECONDS = 60
_recent_runs: dict[int, deque[float]] = defaultdict(deque)


def enforce_rate_limit(user_id: int) -> None:
    now = time.monotonic()
    window = _recent_runs[user_id]
    while window and now - window[0] > WINDOW_SECONDS:
        window.popleft()
    if len(window) >= RUNS_PER_WINDOW:
        retry_in = int(WINDOW_SECONDS - (now - window[0])) + 1
        raise HTTPException(status_code=429, detail=f"Rate limit reached. Try again in {retry_in}s.")
    window.append(now)


@router.post("/run")
async def run(payload: RunRequest, user: models.User = Depends(get_current_user)):
    if payload.language not in sandbox.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")
    enforce_rate_limit(user.id)

    result = await run_in_threadpool(sandbox.run_code, payload.language, payload.code, payload.stdin)
    response = {
        "by": user.username,
        "output": result.output,
        "ok": result.ok,
        "duration_ms": result.duration_ms,
    }

    # Share the result with everyone in the room, but only if the caller is actually in it.
    if payload.room_id and hub.has_user(payload.room_id, user.id):
        await hub.broadcast(payload.room_id, {"type": "run_result", "result": response})
    return response
