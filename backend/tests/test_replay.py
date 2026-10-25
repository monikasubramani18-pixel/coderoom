import events


def test_replay_returns_events_in_order(client, alice, room_id):
    events.record_event(room_id, "code", {"code": "a", "language": "python"}, alice.id)
    events.record_event(room_id, "run", {"ok": True, "duration_ms": 5, "output": "hi"}, alice.id)

    data = client.get(f"/rooms/{room_id}/replay", headers=alice.headers).json()
    assert [e["kind"] for e in data["events"]] == ["code", "run"]
    assert data["events"][0]["t"] == 0
    assert data["events"][0]["user"] == alice.username
    assert data["events"][0]["data"] == {"code": "a", "language": "python"}
    assert data["events"][1]["t"] >= 0


def test_replay_of_an_empty_room_has_no_events(client, alice, room_id):
    data = client.get(f"/rooms/{room_id}/replay", headers=alice.headers).json()
    assert data["events"] == [] and data["started_at"] is None


def test_replay_is_limited_to_the_host_and_participants(client, alice, bob, room_id):
    events.record_event(room_id, "code", {"code": "a", "language": "python"}, alice.id)
    assert client.get(f"/rooms/{room_id}/replay", headers=bob.headers).status_code == 403

    events.record_event(room_id, "join", {"username": bob.username}, bob.id)
    assert client.get(f"/rooms/{room_id}/replay", headers=bob.headers).status_code == 200


def test_replay_of_an_unknown_room_is_not_found(client, alice):
    assert client.get("/rooms/doesnotexist/replay", headers=alice.headers).status_code == 404


def test_replay_requires_authentication(client, room_id):
    assert client.get(f"/rooms/{room_id}/replay").status_code in (401, 403)


def test_recording_stops_at_the_per_room_cap(client, alice, room_id, monkeypatch):
    monkeypatch.setattr(events, "MAX_EVENTS_PER_ROOM", 2)
    for index in range(4):
        events.record_event(room_id, "code", {"code": str(index), "language": "python"}, alice.id)
    replay = client.get(f"/rooms/{room_id}/replay", headers=alice.headers).json()
    assert [e["data"]["code"] for e in replay["events"]] == ["0", "1"]


def test_a_live_session_is_recorded(client, alice, room_id):
    with client.websocket_connect(f"/ws/{room_id}?token={alice.token}") as socket:
        socket.receive_json()  # init
        socket.receive_json()  # presence
        socket.send_json({"type": "code", "code": "print('hi')\n", "language": "python"})

    recorded = client.get(f"/rooms/{room_id}/replay", headers=alice.headers).json()["events"]
    kinds = [e["kind"] for e in recorded]
    assert kinds[0] == "code"  # the starting code
    assert "join" in kinds and kinds[-1] == "leave"
    assert any(e["kind"] == "code" and e["data"]["code"] == "print('hi')\n" for e in recorded)
