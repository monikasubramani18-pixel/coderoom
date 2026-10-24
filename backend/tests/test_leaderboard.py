import sandbox


def echo_run_code(language, code, stdin=""):
    """Fake sandbox: the program prints its input back, so expected == input passes."""
    return sandbox.RunResult(output=stdin, ok=True, duration_ms=1, stdout=stdin)


def solve(client, user, problem_id, expected="1"):
    body = {
        "language": "python",
        "code": "print(input())",
        "problem_id": problem_id,
        "cases": [{"input": "1\n", "expected": expected}],
    }
    assert client.post("/run/tests", json=body, headers=user.headers).status_code == 200


def test_leaderboard_requires_authentication(client):
    assert client.get("/leaderboard").status_code in (401, 403)


def test_leaderboard_counts_distinct_solved_problems(client, alice, bob, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", echo_run_code)
    solve(client, alice, "two-sum")
    solve(client, alice, "two-sum")  # solving the same problem again does not add a point
    solve(client, alice, "fizzbuzz")
    solve(client, bob, "two-sum")

    board = client.get("/leaderboard", headers=bob.headers).json()
    assert [(row["rank"], row["username"], row["solved"]) for row in board] == [
        (1, alice.username, 2),
        (2, bob.username, 1),
    ]
    assert [row["is_you"] for row in board] == [False, True]


def test_failed_attempts_do_not_count_as_solved(client, alice, monkeypatch):
    monkeypatch.setattr(sandbox, "run_code", echo_run_code)
    solve(client, alice, "two-sum", expected="999")
    assert client.get("/leaderboard", headers=alice.headers).json() == []
