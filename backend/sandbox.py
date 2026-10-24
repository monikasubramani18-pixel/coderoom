"""Docker-based sandbox for running untrusted code."""
import logging
import subprocess
import time
import uuid
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# language -> (docker image, source file name, shell command that compiles/runs it)
RUNNERS: dict[str, tuple[str, str, str]] = {
    "python": ("python:3.12-alpine", "main.py", "python main.py"),
    "javascript": ("node:22-alpine", "main.js", "node main.js"),
    "java": ("eclipse-temurin:21-jdk-alpine", "Main.java", "java Main.java"),
    "c": ("gcc:14", "main.c", "gcc main.c -o main && ./main"),
    "cpp": ("gcc:14", "main.cpp", "g++ main.cpp -o main && ./main"),
}
SUPPORTED_LANGUAGES = frozenset(RUNNERS)

TIMEOUT_SECONDS = 15
MAX_OUTPUT_CHARS = 10_000
MAX_CODE_CHARS = 50_000
MAX_STDIN_CHARS = 10_000


@dataclass(frozen=True)
class RunResult:
    output: str  # stdout + stderr, shown to the user
    ok: bool
    duration_ms: int
    stdout: str = ""  # stdout only, used for judging test cases
    timed_out: bool = False


def run_code(language: str, code: str, stdin: str = "") -> RunResult:
    """Run `code` in a locked-down, throw-away container.

    The container receives a single stdin stream: the source code first, then the
    program input. `dd` copies exactly len(code) bytes into the source file and the
    remaining bytes stay available to the program as its stdin. Nothing from the
    host file system is mounted.
    """
    image, filename, command = RUNNERS[language]
    code_bytes = code.encode("utf-8")
    payload = code_bytes + stdin.encode("utf-8")
    shell_command = f"dd bs=1 count={len(code_bytes)} of={filename} 2>/dev/null && {command}"
    container_name = f"coderoom-{uuid.uuid4().hex[:12]}"

    docker_command = [
        "docker", "run", "--rm", "-i",
        "--name", container_name,
        "--network", "none",              # no network access
        "--memory", "256m",               # memory limit
        "--cpus", "0.5",                  # CPU limit
        "--pids-limit", "64",             # mitigates fork bombs
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--read-only",
        "--tmpfs", "/tmp:rw,exec,size=64m,mode=1777",
        "-w", "/tmp",
        "--user", "1000:1000",
        image,
        "sh", "-c", shell_command,
    ]

    started = time.perf_counter()
    try:
        process = subprocess.run(
            docker_command,
            input=payload,
            capture_output=True,
            timeout=TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
        return RunResult(
            f"Time limit exceeded ({TIMEOUT_SECONDS}s)", False, TIMEOUT_SECONDS * 1000, timed_out=True
        )
    except FileNotFoundError:
        return RunResult("Docker is not installed or not on PATH.", False, 0)

    duration_ms = int((time.perf_counter() - started) * 1000)
    output = (process.stdout + process.stderr).decode("utf-8", errors="replace")
    if process.returncode == 125:  # `docker run` itself failed (daemon down, image missing, ...)
        logger.warning("docker run failed: %s", output.strip())
        output = f"Execution service error. Is Docker running?\n\n{output}"
    stdout = process.stdout.decode("utf-8", errors="replace")[:MAX_OUTPUT_CHARS]
    return RunResult(
        output[:MAX_OUTPUT_CHARS] or "(no output)", process.returncode == 0, duration_ms, stdout=stdout
    )
