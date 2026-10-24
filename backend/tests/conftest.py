import os
from types import SimpleNamespace

# Use a throw-away SQLite database so tests never touch real data.
os.environ["DATABASE_URL"] = "sqlite:///./test_coderoom.db"
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import pytest
from fastapi.testclient import TestClient

from database import Base, engine
from main import app
from realtime import hub
from routers import auth_routes
from routers import run as run_router


@pytest.fixture
def client():
    hub.peers.clear()
    hub.states.clear()
    hub._save_tasks.clear()
    for limiter in (auth_routes.login_limiter, auth_routes.register_limiter, run_router.run_limiter):
        limiter._calls.clear()

    with TestClient(app) as test_client:  # runs the lifespan, which creates the tables
        yield test_client
    Base.metadata.drop_all(bind=engine)


def make_user(client: TestClient, username: str) -> SimpleNamespace:
    response = client.post(
        "/register",
        json={"username": username, "email": f"{username}@example.com", "password": "secret123"},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    return SimpleNamespace(
        id=data["user"]["id"],
        username=username,
        token=data["token"],
        headers={"Authorization": f"Bearer {data['token']}"},
    )


@pytest.fixture
def alice(client):
    return make_user(client, "alice")


@pytest.fixture
def bob(client):
    return make_user(client, "bob")


@pytest.fixture
def room_id(client, alice):
    response = client.post("/rooms", json={"title": "Mock interview"}, headers=alice.headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]
