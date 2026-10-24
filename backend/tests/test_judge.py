import judge
import sandbox


def result(stdout="", ok=True, timed_out=False, output=None):
    return sandbox.RunResult(
        output=stdout if output is None else output, ok=ok, duration_ms=4, stdout=stdout, timed_out=timed_out
    )


def test_normalize_ignores_trailing_whitespace_and_blank_end_lines():
    assert judge.normalize("1 2  \n3\n\n") == "1 2\n3"


def test_each_case_gets_the_right_verdict(monkeypatch):
    outcomes = iter(
        [
            result("5\n"),  # matches
            result("6\n"),  # differs
            result("", ok=False, output="Traceback: boom"),
            result("", ok=False, timed_out=True, output="Time limit exceeded (15s)"),
        ]
    )
    monkeypatch.setattr(sandbox, "run_code", lambda language, code, stdin="": next(outcomes))

    cases = [{"input": "x", "expected": "5"}] * 4
    verdicts = [r["verdict"] for r in judge.judge_cases("python", "code", cases)]
    assert verdicts == ["passed", "wrong_answer", "error", "time_limit"]


def test_program_input_is_passed_to_the_sandbox(monkeypatch):
    seen = []
    monkeypatch.setattr(
        sandbox, "run_code", lambda language, code, stdin="": seen.append(stdin) or result("ok")
    )
    judge.judge_cases("python", "code", [{"input": "3\n1 2 3", "expected": "ok"}])
    assert seen == ["3\n1 2 3"]
