from tests.conftest import make_user


def test_register_returns_token_and_user(client):
    response = client.post(
        "/register", json={"username": "carol", "email": "Carol@Example.com", "password": "secret123"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["token"]
    assert body["user"]["username"] == "carol"
    assert body["user"]["email"] == "carol@example.com"  # normalised to lower case


def test_register_rejects_duplicates(client, alice):
    response = client.post(
        "/register", json={"username": "alice", "email": "other@example.com", "password": "secret123"}
    )
    assert response.status_code == 409


def test_register_validates_input(client):
    response = client.post("/register", json={"username": "ab", "email": "bad", "password": "123"})
    assert response.status_code == 422


def test_login_by_username_and_email(client, alice):
    by_username = client.post("/login", json={"username": "alice", "password": "secret123"})
    by_email = client.post("/login", json={"username": "alice@example.com", "password": "secret123"})
    assert by_username.status_code == 200
    assert by_email.status_code == 200


def test_login_rejects_wrong_password(client, alice):
    response = client.post("/login", json={"username": "alice", "password": "wrong-password"})
    assert response.status_code == 401


def test_login_is_rate_limited_per_account(client, alice):
    statuses = [
        client.post("/login", json={"username": "alice", "password": "wrong"}).status_code
        for _ in range(11)
    ]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429


def test_me_requires_a_valid_token(client, alice):
    assert client.get("/me").status_code in (401, 403)
    assert client.get("/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    response = client.get("/me", headers=alice.headers)
    assert response.status_code == 200
    assert response.json()["username"] == "alice"


def test_passwords_are_not_stored_in_plain_text(client, alice):
    from database import SessionLocal
    from models import User

    with SessionLocal() as db:
        user = db.get(User, alice.id)
        assert user.password_hash != "secret123"
        assert user.password_hash.startswith("$2")  # bcrypt


def test_make_user_helper_creates_distinct_users(client):
    assert make_user(client, "dave").id != make_user(client, "erin").id
