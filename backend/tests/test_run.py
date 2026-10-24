import sandbox
from routers.run import RUNS_PER_MINUTE


def fake_run_code(language, code, stdin=""):
    return sandbox.RunResult(output=f"ran {language}", ok=True, duration_ms=5)


def test_run_requires_authentication(client):
    response = client.post("/run", json={"language": "python", "code": "print(1)"})
    assert response.status_code in (401, 403)


def test_run_returns_the_sandbox_result(client, alice, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", fake_run_code)
    response = client.post("/run", json={"language": "python", "code": "print(1)"}, headers=alice.headers)
    assert response.status_code == 200
    assert response.json() == {"by": "alice", "output": "ran python", "ok": True, "duration_ms": 5}


def test_run_rejects_unsupported_languages(client, alice):
    response = client.post("/run", json={"language": "cobol", "code": "x"}, headers=alice.headers)
    assert response.status_code == 400


def test_run_is_rate_limited(client, alice, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", fake_run_code)
    payload = {"language": "python", "code": "print(1)"}
    codes = [
        client.post("/run", json=payload, headers=alice.headers).status_code
        for _ in range(RUNS_PER_MINUTE + 1)
    ]
    assert codes[:-1] == [200] * RUNS_PER_MINUTE
    assert codes[-1] == 429
