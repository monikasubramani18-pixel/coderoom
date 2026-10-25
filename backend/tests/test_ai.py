import httpx

import ai_client
from ratelimit import RateLimiter
from routers import ai as ai_router

REQUEST = {"mode": "review", "language": "python", "code": "print(1)", "question": "Print one"}


def enable(monkeypatch, answer="Looks good"):
    captured = {}

    async def fake_ask(system, prompt, max_tokens=800):
        captured.update(system=system, prompt=prompt)
        return answer

    monkeypatch.setattr(ai_client, "is_enabled", lambda: True)
    monkeypatch.setattr(ai_client, "ask", fake_ask)
    return captured


def test_status_reports_whether_the_feature_is_configured(client, alice, monkeypatch):
    monkeypatch.setattr(ai_client, "is_enabled", lambda: False)
    assert client.get("/ai/status", headers=alice.headers).json() == {"enabled": False}
    monkeypatch.setattr(ai_client, "is_enabled", lambda: True)
    assert client.get("/ai/status", headers=alice.headers).json() == {"enabled": True}


def test_assist_requires_authentication(client):
    assert client.post("/ai/assist", json=REQUEST).status_code in (401, 403)


def test_assist_is_unavailable_without_an_api_key(client, alice, monkeypatch):
    monkeypatch.setattr(ai_client, "is_enabled", lambda: False)
    assert client.post("/ai/assist", json=REQUEST, headers=alice.headers).status_code == 503


def test_assist_builds_the_prompt_and_returns_the_answer(client, alice, monkeypatch):
    captured = enable(monkeypatch)
    response = client.post("/ai/assist", json=REQUEST, headers=alice.headers)

    assert response.status_code == 200
    assert response.json() == {"answer": "Looks good"}
    assert "print(1)" in captured["prompt"] and "Print one" in captured["prompt"]
    assert "untrusted" in captured["system"]


def test_assist_rejects_unknown_modes_and_languages(client, alice, monkeypatch):
    enable(monkeypatch)
    assert client.post("/ai/assist", json={**REQUEST, "mode": "write_everything"}, headers=alice.headers).status_code == 422
    assert client.post("/ai/assist", json={**REQUEST, "language": "cobol"}, headers=alice.headers).status_code == 400


def test_assist_is_rate_limited(client, alice, monkeypatch):
    enable(monkeypatch)
    monkeypatch.setattr(ai_router, "ai_limiter", RateLimiter(max_calls=1, window_seconds=60))
    assert client.post("/ai/assist", json=REQUEST, headers=alice.headers).status_code == 200
    assert client.post("/ai/assist", json=REQUEST, headers=alice.headers).status_code == 429


def test_assist_hides_upstream_failures(client, alice, monkeypatch):
    monkeypatch.setattr(ai_client, "is_enabled", lambda: True)

    async def failing_ask(system, prompt, max_tokens=800):
        raise httpx.ConnectError("secret details")

    monkeypatch.setattr(ai_client, "ask", failing_ask)
    response = client.post("/ai/assist", json=REQUEST, headers=alice.headers)
    assert response.status_code == 502
    assert "secret" not in response.text
