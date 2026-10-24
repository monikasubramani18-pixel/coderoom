"""Code execution endpoint with a per-user rate limit."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

import judge
import models
import sandbox
from auth import get_current_user
from database import get_db
from ratelimit import RateLimiter
from realtime import hub
from schemas import RunRequest, RunTestsRequest

router = APIRouter(tags=["execution"])

RUNS_PER_MINUTE = 10
run_limiter = RateLimiter(max_calls=RUNS_PER_MINUTE, window_seconds=60)


@router.post("/run")
async def run(payload: RunRequest, user: models.User = Depends(get_current_user)):
    if payload.language not in sandbox.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")
    if not run_limiter.allow(user.id):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached ({RUNS_PER_MINUTE} runs per minute). Please wait a moment.",
        )

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


@router.post("/run/tests")
async def run_tests(
    payload: RunTestsRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Judge the code against test cases. One call counts once towards the rate limit."""
    if payload.language not in sandbox.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")
    if not run_limiter.allow(user.id):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached ({RUNS_PER_MINUTE} runs per minute). Please wait a moment.",
        )

    cases = [case.model_dump() for case in payload.cases]
    results = await run_in_threadpool(judge.judge_cases, payload.language, payload.code, cases)
    passed = sum(1 for result in results if result["verdict"] == "passed")
    response = {
        "by": user.username,
        "problem_id": payload.problem_id,
        "passed": passed,
        "total": len(results),
        "results": results,
    }

    if payload.problem_id:
        db.add(
            models.Submission(
                user_id=user.id,
                problem_id=payload.problem_id,
                language=payload.language,
                passed_cases=passed,
                total_cases=len(results),
            )
        )
        db.commit()

    if payload.room_id and hub.has_user(payload.room_id, user.id):
        await hub.broadcast(payload.room_id, {"type": "tests_result", "result": response})
    return response
