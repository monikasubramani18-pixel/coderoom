import subprocess
import uuid
from collections import defaultdict

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
from auth import create_token, get_current_user, hash_password, verify_password
from database import Base, engine, get_db

# Tables auto create (later Alembic migrations use pannalam)
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=72)  # bcrypt limit 72 bytes


class LoginRequest(BaseModel):
    username: str  # username illa email, rendu la edhuvum work aagum
    password: str = Field(max_length=72)


def user_out(user: models.User):
    return {"id": user.id, "username": user.username, "email": user.email}


@app.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    exists = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username == req.username,
                models.User.email == req.email.lower(),
            )
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Username illa email already irukku")

    user = models.User(
        username=req.username,
        email=req.email.lower(),
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": user_out(user)}


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username == req.username,
                models.User.email == req.username.lower(),
            )
        )
        .first()
    )
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username/password thappu")
    return {"token": create_token(user.id), "user": user_out(user)}


@app.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return user_out(user)


# ---------- Rooms (WebSocket) ----------
class ConnectionManager:
    def __init__(self):
        self.rooms = defaultdict(list)

    async def connect(self, room_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms[room_id].append(ws)

    def disconnect(self, room_id: str, ws: WebSocket):
        if ws in self.rooms[room_id]:
            self.rooms[room_id].remove(ws)
        if not self.rooms[room_id]:
            del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: str, sender: WebSocket):
        for conn in list(self.rooms[room_id]):
            if conn is not sender:
                await conn.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/{room_id}")
async def ws_room(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(room_id, data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


# ---------- Code execution (Docker sandbox) ----------
RUNNERS = {
    "python": ("python:3.12-alpine", "cat > main.py && python main.py"),
    "javascript": ("node:22-alpine", "cat > main.js && node main.js"),
    "java": ("eclipse-temurin:21-jdk-alpine", "cat > Main.java && java Main.java"),
    "c": ("gcc:14", "cat > main.c && gcc main.c -o main && ./main"),
    "cpp": ("gcc:14", "cat > main.cpp && g++ main.cpp -o main && ./main"),
}

TIMEOUT_SECONDS = 15
MAX_OUTPUT = 10_000


class RunRequest(BaseModel):
    language: str
    code: str


@app.post("/run")
def run_code(req: RunRequest):
    if req.language not in RUNNERS:
        return {"output": f"Unsupported language: {req.language}", "ok": False}
    if len(req.code) > 50_000:
        return {"output": "Code romba perusu (50KB limit).", "ok": False}

    image, shell_cmd = RUNNERS[req.language]
    name = f"coderoom-{uuid.uuid4().hex[:12]}"

    cmd = [
        "docker", "run", "--rm", "-i",
        "--name", name,
        "--network", "none",
        "--memory", "256m",
        "--cpus", "0.5",
        "--pids-limit", "64",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--read-only",
        "--tmpfs", "/tmp:rw,exec,size=64m,mode=1777",
        "-w", "/tmp",
        "--user", "1000:1000",
        image,
        "sh", "-c", shell_cmd,
    ]

    try:
        result = subprocess.run(
            cmd,
            input=req.code,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
        )
        output = (result.stdout + result.stderr)[:MAX_OUTPUT]
        return {"output": output or "(no output)", "ok": result.returncode == 0}
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
        return {"output": f"Time limit exceeded ({TIMEOUT_SECONDS}s)", "ok": False}
    except FileNotFoundError:
        return {"output": "Docker install aagala. Docker Desktop start pannunga.", "ok": False}