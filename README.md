# CodeRoom

Real-time collaborative coding and mock-interview platform. Create a room, invite a friend, write code together, run it in a sandbox and finish with structured feedback.

## Features

- **Live collaboration**: shared Monaco editor, language sync, presence indicators and room chat over WebSockets
- **Sandboxed execution**: Python, JavaScript, Java, C and C++ run in throw-away Docker containers (no network, CPU/memory/PID limits, read-only filesystem, dropped capabilities, 15 s timeout). Supports program input (stdin) and shares the result with everyone in the room
- **Interview mode**: the host posts the question, controls a shared countdown timer and keeps private notes; every participant can leave a rating and written feedback
- **Persistence**: rooms, code, questions and feedback are stored in PostgreSQL; live edits are debounced so the database is not written on every keystroke
- **Authentication**: bcrypt-hashed passwords and JWT access tokens, enforced on REST and WebSocket endpoints
- **Polished UI**: responsive layout, light and dark themes, automatic WebSocket reconnect

## Architecture

```
React (Vite, Tailwind, Monaco)
   |  REST (JSON, Bearer JWT)          WebSocket (/ws/{room}?token=...)
   v                                   v
FastAPI ---- routers: auth, rooms, run, ws
   |            |
   |            +-- realtime.py: in-memory room state, timer, debounced persistence
   |            +-- sandbox.py : docker run --network none --read-only ...
   v
PostgreSQL (users, rooms, feedback)
```

Live state (current code, chat, timer) is kept in memory while a room is active and flushed to PostgreSQL 1.5 s after the last change and when the last participant leaves. This assumes a single API process; Redis pub/sub would be the next step for horizontal scaling.

## Tech stack

FastAPI, SQLAlchemy, PostgreSQL, PyJWT, bcrypt, Docker, React 19, Vite, Tailwind CSS v4, Monaco Editor, lucide-react.

## Getting started

Prerequisites: Python 3.11+, Node 20+, PostgreSQL, Docker Desktop (running).

```bash
# 1. Database
createdb coderoom

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # then edit DATABASE_URL and SECRET_KEY
docker pull python:3.12-alpine   # plus node:22-alpine, eclipse-temurin:21-jdk-alpine, gcc:14
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

## WebSocket protocol

Client to server: `code`, `chat`, `question` (host), `title` (host), `timer` (host).
Server to client: `init`, `code`, `chat`, `question`, `title`, `presence`, `timer`, `run_result`.
Close codes: `4401` unauthorized, `4404` room not found.

## Security notes

- Untrusted code never touches the host: it is streamed over stdin into a container with no network, a read-only root filesystem, a non-root user and resource limits. For production-grade isolation consider gVisor or Firecracker.
- `/run` is authenticated and rate limited per user (10 runs per minute).
- Passwords are hashed with bcrypt; secrets live in `.env`, which is git-ignored.
- The WebSocket token is passed as a query parameter because browsers cannot set headers on WebSockets; short-lived tickets would be the production hardening.

## Known limitations and roadmap

- Concurrent typing uses last-write-wins; moving to a CRDT (Yjs) would give conflict-free merges and remote cursors
- Single-process realtime state; add Redis pub/sub for multiple instances
- Schema changes use a lightweight startup migration; adopt Alembic
- Automated tests (pytest for the API, Playwright for the editor flow)
