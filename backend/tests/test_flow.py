"""The coding pulse: visible to the host and to the person themselves, never to other guests."""


def join(client, room_id, user):
    """Open a socket and consume the init and presence messages sent on join."""
    context = client.websocket_connect(f"/ws/{room_id}?token={user.token}")
    socket = context.__enter__()
    socket.receive_json()  # init
    socket.receive_json()  # presence
    return context, socket


def entry_for(message, user):
    return next(u for u in message["users"] if u["id"] == user.id)


def close(*contexts):
    for context in contexts:
        context.__exit__(None, None, None)


def test_host_sees_everyones_pulse_but_guests_only_their_own(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)  # alice owns the room, so she is the host
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined

        bob_ws.send_json({"type": "flow", "state": "stuck"})
        host_view, guest_view = alice_ws.receive_json(), bob_ws.receive_json()
        assert entry_for(host_view, bob)["flow"] == "stuck"
        assert entry_for(guest_view, bob)["flow"] == "stuck"  # you can always see your own pulse

        alice_ws.send_json({"type": "flow", "state": "flow"})
        host_view, guest_view = alice_ws.receive_json(), bob_ws.receive_json()
        assert entry_for(host_view, alice)["flow"] == "flow"
        assert entry_for(guest_view, alice)["flow"] is None  # guests never see anyone else's pulse
    finally:
        close(ctx_b, ctx_a)


def test_invalid_and_repeated_states_are_ignored(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined

        bob_ws.send_json({"type": "flow", "state": "thinking"})
        assert entry_for(alice_ws.receive_json(), bob)["flow"] == "thinking"
        bob_ws.receive_json()

        bob_ws.send_json({"type": "flow", "state": "bogus"})  # not a known state
        bob_ws.send_json({"type": "flow", "state": ["stuck"]})  # wrong type
        bob_ws.send_json({"type": "flow", "state": "thinking"})  # unchanged
        bob_ws.send_json({"type": "chat", "text": "hello"})
        assert alice_ws.receive_json()["type"] == "chat"  # nothing above produced a presence update
    finally:
        close(ctx_b, ctx_a)


def test_sharing_can_be_switched_off(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        bob_ws.send_json({"type": "flow", "state": "stuck"})
        alice_ws.receive_json()
        bob_ws.receive_json()

        bob_ws.send_json({"type": "flow", "state": None})
        assert entry_for(alice_ws.receive_json(), bob)["flow"] is None
    finally:
        close(ctx_b, ctx_a)


def test_pulse_changes_are_recorded_for_replay(client, alice, bob, room_id):
    ctx_a, alice_ws = join(client, room_id, alice)
    ctx_b, bob_ws = join(client, room_id, bob)
    try:
        alice_ws.receive_json()  # presence: bob joined
        bob_ws.send_json({"type": "flow", "state": "stuck"})
        alice_ws.receive_json()
        bob_ws.receive_json()

        events = client.get(f"/rooms/{room_id}/replay", headers=alice.headers).json()["events"]
        pulses = [e for e in events if e["kind"] == "flow"]
        assert [(e["user"], e["data"]["state"]) for e in pulses] == [(bob.username, "stuck")]
    finally:
        close(ctx_b, ctx_a)
