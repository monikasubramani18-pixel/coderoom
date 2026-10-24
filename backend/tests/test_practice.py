import sandbox


def echo_run_code(language, code, stdin=""):
    """Fake sandbox: the program prints its input back."""
    return sandbox.RunResult(output=stdin, ok=True, duration_ms=3, stdout=stdin)


def post_tests(client, user, expected_second):
    body = {
        "language": "python",
        "code": "print(input())",
        "problem_id": "two-sum",
        "cases": [{"input": "1\n", "expected": "1"}, {"input": "2\n", "expected": expected_second}],
    }
    return client.post("/run/tests", json=body, headers=user.headers)


def test_run_tests_requires_authentication(client):
    body = {"language": "python", "code": "x", "cases": [{"input": "", "expected": ""}]}
    assert client.post("/run/tests", json=body).status_code in (401, 403)


def test_run_tests_returns_a_verdict_per_case(client, alice, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", echo_run_code)
    data = post_tests(client, alice, expected_second="3").json()
    assert (data["passed"], data["total"]) == (1, 2)
    assert [r["verdict"] for r in data["results"]] == ["passed", "wrong_answer"]


def test_progress_tracks_attempts_and_solved_problems(client, alice, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", echo_run_code)

    post_tests(client, alice, expected_second="3")  # fails one case
    problem = client.get("/progress", headers=alice.headers).json()["problems"][0]
    assert (problem["problem_id"], problem["attempts"], problem["solved"]) == ("two-sum", 1, False)

    post_tests(client, alice, expected_second="2")  # all cases pass
    progress = client.get("/progress", headers=alice.headers).json()
    assert (progress["problems"][0]["attempts"], progress["problems"][0]["solved"]) == (2, True)
    assert len(progress["activity"]) == 2


def test_progress_is_private_to_each_user(client, alice, bob, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", echo_run_code)
    post_tests(client, alice, expected_second="2")
    assert client.get("/progress", headers=bob.headers).json() == {"problems": [], "activity": []}


def test_practice_room_can_be_created_with_a_problem(client, alice):
    response = client.post(
        "/rooms",
        json={
            "title": "Two Sum",
            "problem_id": "two-sum",
            "question": "Find two numbers",
            "code": "# solve\n",
            "language": "python",
        },
        headers=alice.headers,
    )
    assert response.status_code == 201
    rooms = client.get("/rooms", headers=alice.headers).json()
    assert rooms[0]["problem_id"] == "two-sum"


def test_create_room_rejects_unsupported_language(client, alice):
    response = client.post("/rooms", json={"title": "x", "language": "cobol"}, headers=alice.headers)
    assert response.status_code == 400
