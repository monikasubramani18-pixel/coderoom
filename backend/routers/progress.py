"""Practice progress: which library problems the user has attempted and solved."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(tags=["progress"])

MAX_SUBMISSIONS_SCANNED = 2_000
MAX_ACTIVITY_ENTRIES = 500


@router.get("/progress")
def get_progress(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    submissions = (
        db.query(models.Submission)
        .filter(models.Submission.user_id == user.id)
        .order_by(models.Submission.created_at.desc())
        .limit(MAX_SUBMISSIONS_SCANNED)
        .all()
    )

    problems: dict[str, dict] = {}
    for submission in submissions:  # newest first
        entry = problems.setdefault(
            submission.problem_id,
            {
                "problem_id": submission.problem_id,
                "attempts": 0,
                "solved": False,
                "last_attempt_at": submission.created_at.isoformat() if submission.created_at else None,
            },
        )
        entry["attempts"] += 1
        if submission.total_cases > 0 and submission.passed_cases == submission.total_cases:
            entry["solved"] = True

    # Raw timestamps; the browser groups them by local day to compute the streak.
    activity = [s.created_at.isoformat() for s in submissions[:MAX_ACTIVITY_ENTRIES] if s.created_at]
    return {"problems": list(problems.values()), "activity": activity}
