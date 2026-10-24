import time

import pytest
from starlette.websockets import WebSocketDisconnect

import models
from database import SessionLocal


def ws_url(room_id, user):
    return f"/ws/{room_id}?token={user.token}"


def join(client, room_id, user):
    """Open a socket and consume the init and presence messages sent on join."""
    context = client.websocket_connect(ws_url(room_id, user))
    socket = context.__enter__()
    init = socket.receive_json()
    socket.receive_json()  # presence
    return context, socket, init


def test_invalid_token_is_rejected(client, room_id):
    with pytest.raises(WebSocketDisconnect) as error:
        with client.websocket_connect(f"/ws/{room_id}?token=bad") as socket:
            socket.receive_text()
    assert error.value.code == 4401


def test_unknown_room_is_rejected(client, alice):
    with pytest.raises(WebSocketDisconnect) as error:
        with client.websocket_connect(ws_url("missing", alice)) as socket:
            socket.receive_text()
    assert error.value.code == 4404


def test_init_message_describes_the_room(client, alice, room_id):
    context, _, init = join(client, room_id, alice)
    try:
        assert init["type"] == "init"
        assert init["you"] == {"id": alice.id, "username": "alice", "is_host": True}
        assert init["room"]["title"] == "Mock interview"
        assert init["timer"]["duration"] == 2700
        assert init["users"][0]["is_host"] is True
    finally:
        context.__exit__(None, None, None)


def test_chat_and_code_reach_other_participants(client, alice, bob, room_id):
    ctx_a, alice_ws, _ = join(client, room_id, alice)
    ctx_b, bob_ws, _ = join(client, room_id, bob)
    try:
        assert alice_ws.receive_json()["type"] == "presence"  # bob joined

        bob_ws.send_json({"type": "chat", "text": "hello"})
        for socket in (alice_ws, bob_ws):
            message = socket.receive_json()
            assert message["type"] == "chat"
            assert message["message"]["text"] == "hello"
            assert message["message"]["user"] == "bob"

        bob_ws.send_json({"type": "code", "code": "print(1)\n", "language": "python"})
        assert alice_ws.receive_json() == {"type": "code", "code": "print(1)\n", "language": "python"}
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_only_the_host_can_change_the_question_and_timer(client, alice, bob, room_id):
    ctx_a, alice_ws, _ = join(client, room_id, alice)
    ctx_b, bob_ws, _ = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined

        # Guest attempts are ignored. The chat message acts as a marker: if the question
        # had been accepted, alice would receive a "question" message before it.
        bob_ws.send_json({"type": "question", "text": "hacked"})
        bob_ws.send_json({"type": "timer", "action": "start"})
        bob_ws.send_json({"type": "chat", "text": "marker"})
        assert alice_ws.receive_json()["type"] == "chat"
        assert bob_ws.receive_json()["type"] == "chat"

        alice_ws.send_json({"type": "question", "text": "Two Sum"})
        assert bob_ws.receive_json() == {"type": "question", "text": "Two Sum"}

        alice_ws.send_json({"type": "timer", "action": "start"})
        for socket in (alice_ws, bob_ws):
            message = socket.receive_json()
            assert message["type"] == "timer" and message["running"] is True
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_code_is_saved_when_the_last_user_leaves(client, alice, room_id):
    context, socket, _ = join(client, room_id, alice)
    socket.send_json({"type": "code", "code": "print('saved')\n", "language": "python"})
    socket.send_json({"type": "question", "text": "Reverse a string"})
    context.__exit__(None, None, None)

    saved = None
    for _ in range(30):  # the server flushes asynchronously after the socket closes
        with SessionLocal() as db:
            room = db.get(models.Room, room_id)
            saved = (room.code, room.question)
        if saved[0] == "print('saved')\n":
            break
        time.sleep(0.1)
    assert saved == ("print('saved')\n", "Reverse a string")
