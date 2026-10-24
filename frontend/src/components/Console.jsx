import { useEffect, useState } from 'react'
import { CheckCircle2, FlaskConical, Loader2, XCircle } from 'lucide-react'
import { primaryButton } from '../lib/ui'

const VERDICTS = {
  passed: { label: 'Passed', tone: 'text-success' },
  wrong_answer: { label: 'Wrong answer', tone: 'text-danger' },
  error: { label: 'Error', tone: 'text-danger' },
  time_limit: { label: 'Time limit exceeded', tone: 'text-warning' },
}

function Block({ label, text }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-raised px-2 py-1 text-xs text-ink">{text || '(empty)'}</pre>
    </div>
  )
}

function TestsView({ problem, result, error, running, onRun }) {
  const showing = result && result.problem_id === problem.id ? result : null

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink">
          {showing ? (
            <>
              <span className={`font-semibold ${showing.passed === showing.total ? 'text-success' : 'text-danger'}`}>
                {showing.passed} / {showing.total} passed
              </span>
              <span className="ml-2 text-xs text-muted">run by {showing.by}</span>
            </>
          ) : (
            <span className="text-muted">{problem.tests.length} test cases for {problem.title}</span>
          )}
        </p>
        <button onClick={onRun} disabled={running} className={primaryButton}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          {running ? 'Judging...' : 'Run tests'}
        </button>
      </div>

      {error && <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {showing && (
        <ul className="space-y-2">
          {showing.results.map((item, index) => {
            const verdict = VERDICTS[item.verdict] || VERDICTS.error
            const test = problem.tests[index]
            return (
              <li key={`${index}-${item.verdict}`} className="rounded-md border border-line">
                <details open={item.verdict !== 'passed'}>
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                    {item.verdict === 'passed' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className={`h-4 w-4 ${verdict.tone}`} />
                    )}
                    <span className="text-ink">Test {item.case}</span>
                    <span className={`text-xs font-medium ${verdict.tone}`}>{verdict.label}</span>
                    <span className="ml-auto text-xs text-muted">{item.duration_ms} ms</span>
                  </summary>
                  <div className="space-y-2 border-t border-line p-3">
                    {test && <Block label="Input" text={test.input} />}
                    {test && <Block label="Expected" text={test.expected} />}
                    <Block label={item.verdict === 'passed' || item.verdict === 'wrong_answer' ? 'Your output' : 'Details'} text={item.actual} />
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Console({
  result,
  error,
  running,
  stdin,
  onStdinChange,
  problem,
  testResult,
  testsError,
  testsRunning,
  onRunTests,
}) {
  const [tab, setTab] = useState('output')

  // Jump to the matching tab whenever a new result arrives (yours or a teammate's).
  useEffect(() => {
    if (result) setTab('output')
  }, [result])
  useEffect(() => {
    if (testResult) setTab('tests')
  }, [testResult])
  useEffect(() => {
    if (!problem && tab === 'tests') setTab('output')
  }, [problem, tab])

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${
      tab === name ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
    }`

  return (
    <section className="flex h-64 shrink-0 flex-col border-t border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line">
        <div className="flex">
          <button className={tabClass('output')} onClick={() => setTab('output')}>
            Output
          </button>
          <button className={tabClass('input')} onClick={() => setTab('input')}>
            Input (stdin)
          </button>
          {problem && (
            <button className={tabClass('tests')} onClick={() => setTab('tests')}>
              Tests
            </button>
          )}
        </div>
        {tab === 'output' && result && !running && (
          <div className="flex items-center gap-3 pr-4 text-xs text-muted">
            <span className={`inline-flex items-center gap-1 font-medium ${result.ok ? 'text-success' : 'text-danger'}`}>
              {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {result.ok ? 'Success' : 'Failed'}
            </span>
            <span>{result.duration_ms} ms</span>
            <span>run by {result.by}</span>
          </div>
        )}
      </div>

      {tab === 'tests' && problem ? (
        <TestsView problem={problem} result={testResult} error={testsError} running={testsRunning} onRun={onRunTests} />
      ) : tab === 'input' ? (
        <textarea
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Program input, one value per line. Read it with input(), scanf, Scanner, etc."
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      ) : (
        <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm">
          {running ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Running in sandbox...
            </span>
          ) : error ? (
            <span className="text-danger">{error}</span>
          ) : result ? (
            <span className={result.ok ? 'text-ink' : 'text-danger'}>{result.output}</span>
          ) : (
            <span className="text-muted">Run your code to see the output here.</span>
          )}
        </pre>
      )}
    </section>
  )
}
