import { useMemo } from 'react'
import { DIFFICULTIES, PROBLEMS, TOPICS } from '../lib/problems'

function ProgressRow({ label, solved, total }) {
  const percent = total === 0 ? 0 : Math.round((solved / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-muted">
          {solved} / {total}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-raised"
        role="progressbar"
        aria-label={`${label}: ${solved} of ${total} solved`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={solved}
      >
        <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

const summarize = (groupOf, groups, solvedIds) =>
  groups.map((group) => {
    const items = PROBLEMS.filter((p) => groupOf(p) === group)
    return { group, total: items.length, solved: items.filter((p) => solvedIds.has(p.id)).length }
  })

export default function TopicProgress({ solvedIds }) {
  const byDifficulty = useMemo(() => summarize((p) => p.difficulty, DIFFICULTIES, solvedIds), [solvedIds])
  const byTopic = useMemo(() => summarize((p) => p.topic, TOPICS, solvedIds), [solvedIds])

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">By difficulty</p>
        {byDifficulty.map((row) => (
          <ProgressRow key={row.group} label={row.group} solved={row.solved} total={row.total} />
        ))}
      </div>
      <div className="grid gap-x-8 gap-y-4 md:col-span-2 sm:grid-cols-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted sm:col-span-2">By topic</p>
        {byTopic.map((row) => (
          <ProgressRow key={row.group} label={row.group} solved={row.solved} total={row.total} />
        ))}
      </div>
    </div>
  )
}
