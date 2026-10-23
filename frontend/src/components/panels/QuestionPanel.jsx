import { inputClass } from '../../lib/ui'

export default function QuestionPanel({ question, isHost, onChange }) {
  if (isHost) {
    return (
      <div className="flex h-full flex-col gap-2 p-4">
        <p className="text-xs text-muted">Visible to everyone in the room. Changes sync live.</p>
        <textarea
          value={question}
          onChange={(e) => onChange(e.target.value)}
          maxLength={5000}
          placeholder="Describe the problem, constraints and examples..."
          className={`${inputClass} flex-1 resize-none`}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {question ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{question}</p>
      ) : (
        <p className="pt-6 text-center text-sm text-muted">The host has not posted a question yet.</p>
      )}
    </div>
  )
}
