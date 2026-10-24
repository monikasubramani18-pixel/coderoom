def test_create_and_list_rooms(client, alice, room_id):
    response = client.get("/rooms", headers=alice.headers)
    assert response.status_code == 200
    rooms = response.json()
    assert [r["id"] for r in rooms] == [room_id]
    assert rooms[0]["title"] == "Mock interview"
    assert rooms[0]["active"] is False


def test_rooms_require_authentication(client):
    assert client.post("/rooms", json={}).status_code in (401, 403)
    assert client.get("/rooms").status_code in (401, 403)


def test_notes_are_private_to_the_host(client, alice, bob, room_id):
    saved = client.put(f"/rooms/{room_id}/notes", json={"notes": "strong candidate"}, headers=alice.headers)
    assert saved.status_code == 200
    assert client.get(f"/rooms/{room_id}/notes", headers=alice.headers).json() == {
        "notes": "strong candidate"
    }
    assert client.get(f"/rooms/{room_id}/notes", headers=bob.headers).status_code == 403
    assert client.put(f"/rooms/{room_id}/notes", json={"notes": "x"}, headers=bob.headers).status_code == 403


def test_unknown_room_returns_404(client, alice):
    assert client.get("/rooms/does-not-exist/notes", headers=alice.headers).status_code == 404


def test_only_the_owner_can_delete_a_room(client, alice, bob, room_id):
    assert client.delete(f"/rooms/{room_id}", headers=bob.headers).status_code == 403
    assert client.delete(f"/rooms/{room_id}", headers=alice.headers).status_code == 204
    assert client.get("/rooms", headers=alice.headers).json() == []


def test_feedback_is_one_entry_per_author(client, alice, bob, room_id):
    first = client.put(f"/rooms/{room_id}/feedback", json={"rating": 5, "comment": "Great"}, headers=bob.headers)
    assert first.status_code == 200
    client.put(f"/rooms/{room_id}/feedback", json={"rating": 3, "comment": "Updated"}, headers=bob.headers)
    client.put(f"/rooms/{room_id}/feedback", json={"rating": 4}, headers=alice.headers)

    items = client.get(f"/rooms/{room_id}/feedback", headers=alice.headers).json()
    assert len(items) == 2
    bobs = next(item for item in items if item["author"] == "bob")
    assert (bobs["rating"], bobs["comment"]) == (3, "Updated")


def test_feedback_rating_must_be_between_1_and_5(client, alice, room_id):
    response = client.put(f"/rooms/{room_id}/feedback", json={"rating": 6}, headers=alice.headers)
    assert response.status_code == 422


def test_deleting_a_room_removes_its_feedback(client, alice, room_id):
    client.put(f"/rooms/{room_id}/feedback", json={"rating": 5}, headers=alice.headers)
    assert client.delete(f"/rooms/{room_id}", headers=alice.headers).status_code == 204
    assert client.get(f"/rooms/{room_id}/feedback", headers=alice.headers).status_code == 404
