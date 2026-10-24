import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, CircleDot, Search } from 'lucide-react'
import { DIFFICULTIES, DIFFICULTY_STYLES, PROBLEMS, TOPICS } from '../lib/problems'
import { ghostButton, inputClass } from '../lib/ui'

const EMPTY = new Set()

/** Filterable list of library problems. Used by the practice dashboard and the host picker. */
export default function ProblemList({
  solvedIds = EMPTY,
  attemptedIds = EMPTY,
  actionLabel,
  onSelect,
  disabled = false,
}) {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [topic, setTopic] = useState('All')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return PROBLEMS.filter(
      (p) =>
        (difficulty === 'All' || p.difficulty === difficulty) &&
        (topic === 'All' || p.topic === topic) &&
        (!needle || p.title.toLowerCase().includes(needle))
    )
  }, [query, difficulty, topic])

  const selectClass = 'h-9 rounded-md border border-line bg-raised px-2 text-sm text-ink'

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line p-4">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems"
            aria-label="Search problems"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectClass} aria-label="Difficulty">
          <option value="All">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={selectClass} aria-label="Topic">
          <option value="All">All topics</option>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">No problems match your filters.</p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((problem) => {
            const solved = solvedIds.has(problem.id)
            const attempted = attemptedIds.has(problem.id)
            const StatusIcon = solved ? CheckCircle2 : attempted ? CircleDot : Circle
            return (
              <li key={problem.id} className="flex items-center gap-3 px-4 py-3">
                <StatusIcon
                  className={`h-5 w-5 shrink-0 ${solved ? 'text-success' : attempted ? 'text-warning' : 'text-muted'}`}
                  aria-label={solved ? 'Solved' : attempted ? 'Attempted' : 'Not attempted'}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{problem.title}</p>
                  <p className="text-xs text-muted">{problem.topic}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLES[problem.difficulty]}`}>
                  {problem.difficulty}
                </span>
                <button onClick={() => onSelect(problem)} disabled={disabled} className={ghostButton}>
                  {actionLabel}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
