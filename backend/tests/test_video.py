"""Camera state, attention status and WebRTC signalling relayed over the room socket."""


def ws_url(room_id, user):
    return f"/ws/{room_id}?token={user.token}"


def join(client, room_id, user):
    """Open a socket and consume the init and presence messages sent on join."""
    context = client.websocket_connect(ws_url(room_id, user))
    socket = context.__enter__()
    socket.receive_json()  # init
    socket.receive_json()  # presence
    return context, socket


def entry_for(message, user):
    return next(u for u in message["users"] if u["id"] == user.id)


def test_camera_flag_is_shared_through_presence(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        bob_ws.send_json({"type": "camera", "on": True})
        for socket in (alice_ws, bob_ws):
            message = socket.receive_json()
            assert message["type"] == "presence"
            assert entry_for(message, bob)["camera"] is True
            assert entry_for(message, alice)["camera"] is False
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_attention_status_is_validated_and_shared(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        bob_ws.send_json({"type": "camera", "on": True})
        alice_ws.receive_json()
        bob_ws.receive_json()

        bob_ws.send_json({"type": "attention", "status": "away"})
        assert entry_for(alice_ws.receive_json(), bob)["attention"] == "away"
        bob_ws.receive_json()

        bob_ws.send_json({"type": "attention", "status": "not-a-status"})  # ignored
        bob_ws.send_json({"type": "attention", "status": ["away"]})  # ignored
        bob_ws.send_json({"type": "attention", "status": "focused"})
        assert entry_for(alice_ws.receive_json(), bob)["attention"] == "focused"
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_attention_is_not_shared_without_the_camera(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        bob_ws.send_json({"type": "attention", "status": "away"})  # camera is off, so nothing is shared
        bob_ws.send_json({"type": "chat", "text": "still here"})
        assert alice_ws.receive_json()["type"] == "chat"  # the first message after joining is the chat, not presence
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_signalling_is_relayed_to_the_target_only(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        offer = {"kind": "offer", "description": {"type": "offer", "sdp": "v=0"}}
        bob_ws.send_json({"type": "rtc", "to": alice.id, "data": offer})

        message = alice_ws.receive_json()
        assert message == {"type": "rtc", "from": bob.id, "data": offer}

        # Bob did not get an echo: the next thing he receives is his own chat message.
        bob_ws.send_json({"type": "chat", "text": "ping"})
        assert bob_ws.receive_json()["type"] == "chat"
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)


def test_invalid_signalling_is_dropped(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        good = {"kind": "candidate", "candidate": {"candidate": "x"}}
        bob_ws.send_json({"type": "rtc", "to": 999_999, "data": good})  # not in the room
        bob_ws.send_json({"type": "rtc", "to": bob.id, "data": good})  # to himself
        bob_ws.send_json({"type": "rtc", "to": alice.id, "data": {"kind": "evil"}})  # unknown kind
        bob_ws.send_json({"type": "rtc", "to": alice.id, "data": "not-a-dict"})
        bob_ws.send_json({"type": "chat", "text": "after"})

        assert alice_ws.receive_json()["type"] == "chat"  # none of the above reached Alice
    finally:
        ctx_b.__exit__(None, None, None)
        ctx_a.__exit__(None, None, None)
