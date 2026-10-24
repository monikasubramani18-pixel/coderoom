import { useState } from 'react'
import { Lightbulb, Library, X } from 'lucide-react'
import { ghostButton, inputClass } from '../../lib/ui'

/** Hints and the model approach. Only the host sees them, so candidates are not spoiled. */
function LearningAids({ problem }) {
  const [revealed, setRevealed] = useState(0)
  const [showApproach, setShowApproach] = useState(false)

  return (
    <div className="space-y-3 border-t border-line p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Lightbulb className="h-4 w-4 text-warning" />
        Hints and approach
        <span className="text-xs font-normal text-muted">(only you can see these)</span>
      </p>

      {problem.hints.slice(0, revealed).map((hint, index) => (
        <p key={hint} className="rounded-md bg-raised px-3 py-2 text-sm text-ink">
          <span className="mr-1 font-medium text-warning">Hint {index + 1}.</span>
          {hint}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        {revealed < problem.hints.length && (
          <button onClick={() => setRevealed(revealed + 1)} className={ghostButton}>
            Show hint {revealed + 1} of {problem.hints.length}
          </button>
        )}
        {!showApproach && (
          <button onClick={() => setShowApproach(true)} className={ghostButton}>
            Show approach
          </button>
        )}
      </div>

      {showApproach && (
        <p className="rounded-md bg-raised px-3 py-2 text-sm leading-relaxed text-ink">{problem.approach}</p>
      )}
    </div>
  )
}

export default function QuestionPanel({ question, isHost, onChange, problem, onOpenPicker, onClearProblem }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {isHost && (
        <div className="flex items-center gap-2 border-b border-line p-3">
          <button onClick={onOpenPicker} className={ghostButton}>
            <Library className="h-4 w-4" />
            {problem ? 'Change problem' : 'Choose problem'}
          </button>
          {problem && (
            <button onClick={onClearProblem} className={ghostButton} aria-label="Remove problem" title="Remove problem">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 p-4">
        {isHost ? (
          <textarea
            value={question}
            onChange={(e) => onChange(e.target.value)}
            maxLength={5000}
            placeholder="Describe the problem, constraints and examples, or choose one from the library."
            aria-label="Question"
            className={`${inputClass} h-72 resize-none`}
          />
        ) : question ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{question}</p>
        ) : (
          <p className="pt-6 text-center text-sm text-muted">The host has not posted a question yet.</p>
        )}
      </div>

      {isHost && problem && <LearningAids key={problem.id} problem={problem} />}
    </div>
  )
}
