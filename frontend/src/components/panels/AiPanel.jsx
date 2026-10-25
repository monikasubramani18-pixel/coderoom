import { useEffect, useState } from 'react'
import { Bug, HelpCircle, Lightbulb, Loader2, ScanSearch, Sparkles } from 'lucide-react'
import { api } from '../../api'
import { ghostButton } from '../../lib/ui'
import RichText from '../RichText'

export default function AiPanel({ token, language, code, question, lastOutput, hasProblem }) {
  const [enabled, setEnabled] = useState(null) // null = checking
  const [mode, setMode] = useState(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api('/ai/status', { token })
      .then((data) => setEnabled(data.enabled))
      .catch(() => setEnabled(false))
  }, [token])

  const ask = async (nextMode) => {
    setMode(nextMode)
    setLoading(true)
    setError('')
    try {
      const data = await api('/ai/assist', {
        method: 'POST',
        token,
        body: { mode: nextMode, language, code, question, output: lastOutput },
      })
      setAnswer(data.answer)
    } catch (err) {
      setAnswer('')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (enabled === null) return <p className="p-4 text-sm text-muted">Checking the assistant...</p>
  if (!enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Sparkles className="h-8 w-8 text-muted" />
        <p className="text-sm font-medium text-ink">AI assistant is not set up</p>
        <p className="text-xs text-muted">
          The server owner can enable it by adding ANTHROPIC_API_KEY to backend/.env and restarting the API.
        </p>
      </div>
    )
  }

  const actions = [
    { id: 'review', label: 'Review my code', icon: ScanSearch },
    { id: 'explain_error', label: 'Explain last output', icon: Bug, disabled: !lastOutput },
    ...(hasProblem ? [{ id: 'hint', label: 'Give me a hint', icon: Lightbulb }] : []),
    { id: 'followups', label: 'Follow-up questions', icon: HelpCircle },
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 border-b border-line p-3">
        {actions.map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            onClick={() => ask(id)}
            disabled={loading || disabled || !code.trim()}
            className={`${ghostButton} justify-start ${mode === id ? 'border-brand' : ''}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 p-4">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
          </p>
        )}
        {error && !loading && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {answer && !loading && <RichText text={answer} />}
        {!answer && !error && !loading && (
          <p className="text-sm text-muted">Pick an action. The answer is only shown to you.</p>
        )}
      </div>

      <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
        Your code and the problem are sent to Claude to generate the answer. AI can make mistakes, so check it before you rely on it.
      </p>
    </div>
  )
}
