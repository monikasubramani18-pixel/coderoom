import subprocess
import uuid
from collections import defaultdict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


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
# Code stdin vazhiya container ku pogum, host file system touch aagaadhu.
RUNNERS = {
    "python": ("python:3.12-alpine", "cat > main.py && python main.py"),
    "javascript": ("node:22-alpine", "cat > main.js && node main.js"),
    "java": ("eclipse-temurin:21-jdk-alpine", "cat > Main.java && java Main.java"),
    "c": ("gcc:14", "cat > main.c && gcc main.c -o main && ./main"),
    "cpp": ("gcc:14", "cat > main.cpp && g++ main.cpp -o main && ./main"),
}

TIMEOUT_SECONDS = 15  # first run la image pull aagum bodhu konjam neram aagum
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
        "--network", "none",          # internet illa
        "--memory", "256m",           # memory limit
        "--cpus", "0.5",              # CPU limit
        "--pids-limit", "64",         # fork bomb thadukka
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