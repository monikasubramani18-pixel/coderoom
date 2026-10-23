import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

export default function Console({ result, error, running, stdin, onStdinChange }) {
  const [tab, setTab] = useState('output')

  // Show the output tab whenever a new result arrives (yours or a teammate's).
  useEffect(() => {
    if (result) setTab('output')
  }, [result])

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${
      tab === name ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
    }`

  return (
    <section className="flex h-52 shrink-0 flex-col border-t border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line">
        <div className="flex">
          <button className={tabClass('output')} onClick={() => setTab('output')}>
            Output
          </button>
          <button className={tabClass('input')} onClick={() => setTab('input')}>
            Input (stdin)
          </button>
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

      {tab === 'input' ? (
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
