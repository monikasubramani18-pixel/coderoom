"""Judges code against test cases by running every case in the sandbox."""
import sandbox


def normalize(text: str) -> str:
    """Ignore trailing whitespace on each line and blank lines at the end."""
    return "\n".join(line.rstrip() for line in text.strip().splitlines())


def judge_cases(language: str, code: str, cases: list[dict]) -> list[dict]:
    """Run `code` once per case and return a verdict for each.

    Verdicts: passed, wrong_answer, error (compile/runtime failure) and time_limit.
    `sandbox.run_code` is looked up on the module so tests can replace it.
    """
    results = []
    for index, case in enumerate(cases, start=1):
        run = sandbox.run_code(language, code, case["input"])
        if run.timed_out:
            verdict, actual = "time_limit", run.output
        elif not run.ok:
            verdict, actual = "error", run.output
        elif normalize(run.stdout) == normalize(case["expected"]):
            verdict, actual = "passed", run.stdout
        else:
            verdict, actual = "wrong_answer", run.stdout
        results.append(
            {
                "case": index,
                "verdict": verdict,
                "actual": actual[:2_000],
                "duration_ms": run.duration_ms,
            }
        )
    return results
