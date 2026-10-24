# CodeRoom

[![CI](https://github.com/monikasubramani18-pixel/coderoom/actions/workflows/ci.yml/badge.svg)](https://github.com/monikasubramani18-pixel/coderoom/actions/workflows/ci.yml)

Real-time collaborative coding and mock-interview platform. Create a room, invite a friend, write code together, run it in a sandbox and finish with structured feedback.

<!-- Add a screenshot or demo GIF here once the app is deployed: ![CodeRoom demo](docs/demo.gif) -->

## Features

- **Live collaboration**: shared Monaco editor, language sync, presence indicators and room chat over WebSockets
- **Sandboxed execution**: Python, JavaScript, Java, C and C++ run in throw-away Docker containers (no network, CPU/memory/PID limits, read-only filesystem, dropped capabilities, 15 s timeout). Supports program input (stdin), `Ctrl/Cmd + Enter` to run, and shares the result with everyone in the room
- **Interview mode**: the host posts the question, controls a shared countdown timer and keeps private notes; every participant can leave a rating and written feedback
- **Practice library**: 20 curated problems (plus a problem of the day) (arrays, strings, stacks, DP, graphs and more) with statements, examples, hints and a worked approach. Each problem runs against test cases in the same sandbox and returns a verdict per case (passed, wrong answer, error, time limit)
- **Practice mode and progress**: start any problem as a private room and invite a friend to solve it together. The dashboard tracks problems solved, test runs and a day streak
- **Motivation**: activity heatmap, day streak and a leaderboard of top problem solvers
- **Video and attention**: opt-in peer-to-peer video (WebRTC) with a mute button, plus on-device attention detection (face and gaze, tab switches, inactivity). Others see a status such as Focused, Looking away or Left the tab, never images
- **Collaboration awareness**: toast notifications (joins, leaves, teammate runs and test results, timer end, reconnects), unread chat badge and a per-room run history
- **Command palette**: `Ctrl/Cmd + K` for quick actions (run, tests, switch language, theme, export, timer)
- **Topic mastery**: progress bars by difficulty and topic
- **Editor preferences**: font size, tab size, word wrap and minimap, remembered per browser
- **Study notes**: export a session (question, final code, results, chat) as a Markdown file for revision
- **Persistence**: rooms, code, questions and feedback are stored in PostgreSQL; live edits are debounced so the database is not written on every keystroke
- **Security**: bcrypt-hashed passwords, JWT access tokens enforced on REST and WebSocket endpoints, rate limiting on login, registration and code execution
- **Polished UI**: responsive layout, light and dark themes, accessible dialogs, error boundary, automatic WebSocket reconnect

## Architecture

```
React (Vite, Tailwind, Monaco)
   |  REST (JSON, Bearer JWT)          WebSocket (/ws/{room}?token=...)
   v                                   v
FastAPI ---- routers: auth, rooms, run (+ judge), progress, ws
   |            |
   |            +-- realtime.py: in-memory room state, timer, debounced persistence
   |            +-- sandbox.py : docker run --network none --read-only ...
   v
PostgreSQL (users, rooms, feedback)
```

Live state (current code, chat, timer) is kept in memory while a room is active and flushed to PostgreSQL 1.5 s after the last change and when the last participant leaves. This assumes a single API process; Redis pub/sub would be the next step for horizontal scaling.

## Tech stack

FastAPI, SQLAlchemy, PostgreSQL, PyJWT, bcrypt, Docker, React 19, Vite, Tailwind CSS v4, Monaco Editor, lucide-react, pytest, GitHub Actions.

## Getting started

Prerequisites: Python 3.11+, Node 20+, PostgreSQL (or Docker), Docker Desktop (running, for code execution).

```bash
# 1. Database (pick one)
createdb coderoom                 # local PostgreSQL
docker compose up -d db           # or the bundled container (host port 5433)

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate             # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # then edit DATABASE_URL and SECRET_KEY
docker pull python:3.12-alpine    # plus node:22-alpine, eclipse-temurin:21-jdk-alpine, gcc:14
uvicorn main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Generate a secret key with `python -c "import secrets; print(secrets.token_hex(32))"`.

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | e.g. `postgresql+psycopg://user:password@localhost:5432/coderoom` |
| `SECRET_KEY` | backend | Signing key for JWTs |
| `FRONTEND_URLS` | backend | Comma-separated allowed CORS origins |
| `VITE_API_URL` | frontend | Backend base URL (default `http://localhost:8000`) |

## Testing

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

The suite uses a throw-away SQLite database and mocks Docker, so it needs neither PostgreSQL nor a running Docker daemon. GitHub Actions runs the backend tests and the frontend production build on every push and pull request.

## WebSocket protocol

Client to server: `code`, `chat`, `question` (host), `problem` (host), `title` (host), `timer` (host), `camera`, `attention`, `rtc`.
Server to client: `init`, `code`, `chat`, `question`, `problem`, `title`, `presence`, `timer`, `run_result`, `tests_result`, `rtc`.
Close codes: `4401` unauthorized, `4404` room not found.

## Video, attention and privacy

- The camera is opt-in per person and starts after an explicit consent dialog. The microphone starts muted.
- Video flows directly between browsers (WebRTC). The server only relays small signalling messages and is never in the media path; nothing is recorded.
- Attention detection (MediaPipe Face Landmarker) runs inside the browser. Only a status label is sent, and users can stop sharing it at any time.
- Browsers cannot truly correct eye gaze. For the closest thing to eye contact, keep the video strip near your webcam and look at the faces; the green ring shows who is looking at their screen.
- Attention signals are hints, not proof. Treat them as a conversation starter, not a verdict about a candidate.
- Strict corporate networks may need a TURN server: set `VITE_ICE_SERVERS` (see `frontend/.env.example`).

## Security notes

- Untrusted code never touches the host: it is streamed over stdin into a container with no network, a read-only root filesystem, a non-root user and resource limits. For production-grade isolation consider gVisor or Firecracker.
- `/run`, `/login` and `/register` are rate limited.
- Passwords are hashed with bcrypt; secrets live in `.env`, which is git-ignored.
- The WebSocket token is passed as a query parameter because browsers cannot set headers on WebSockets; short-lived tickets would be the production hardening.

## Known limitations and roadmap

- Concurrent typing uses last-write-wins; moving to a CRDT (Yjs) would give conflict-free merges and remote cursors
- Single-process realtime state; add Redis pub/sub for multiple instances
- Schema changes use a lightweight startup migration; adopt Alembic
- End-to-end browser tests (Playwright) for the editor flow
