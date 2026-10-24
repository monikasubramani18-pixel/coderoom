import subprocess

import sandbox


def capture_docker_call(monkeypatch):
    captured = {}

    def fake_run(command, **kwargs):
        captured["command"] = command
        captured["input"] = kwargs["input"]
        return subprocess.CompletedProcess(command, 0, stdout=b"hello\n", stderr=b"")

    monkeypatch.setattr(sandbox.subprocess, "run", fake_run)
    return captured


def test_container_is_locked_down(monkeypatch):
    captured = capture_docker_call(monkeypatch)
    sandbox.run_code("python", "print(input())\n", "hello\n")
    command = captured["command"]

    assert command[command.index("--network") + 1] == "none"
    assert "--read-only" in command
    assert command[command.index("--cap-drop") + 1] == "ALL"
    assert "--memory" in command and "--pids-limit" in command


def test_code_and_stdin_share_one_stream(monkeypatch):
    captured = capture_docker_call(monkeypatch)
    code, stdin = "print(input())\n", "hello\n"
    result = sandbox.run_code("python", code, stdin)

    assert captured["input"] == code.encode() + stdin.encode()
    assert f"count={len(code.encode())}" in captured["command"][-1]
    assert result.ok and result.output == "hello\n"


def test_every_language_has_a_runner():
    assert set(sandbox.RUNNERS) == {"python", "javascript", "java", "c", "cpp"}
    assert sandbox.SUPPORTED_LANGUAGES == frozenset(sandbox.RUNNERS)
