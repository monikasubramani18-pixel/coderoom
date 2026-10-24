import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { api } from '../api'
import Avatar from './Avatar'

export default function Leaderboard({ token }) {
  const [rows, setRows] = useState(null) // null = loading

  useEffect(() => {
    api('/leaderboard', { token })
      .then(setRows)
      .catch(() => setRows([]))
  }, [token])

  if (rows === null) {
    return <div className="h-32 animate-pulse rounded-md bg-raised" aria-label="Loading leaderboard" />
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Trophy className="h-7 w-7 text-muted" />
        <p className="text-sm text-muted">Nobody has solved a problem yet. Be the first!</p>
      </div>
    )
  }

  return (
    <ol className="space-y-1.5">
      {rows.map((row) => (
        <li
          key={row.rank}
          className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${row.is_you ? 'bg-brand/10' : ''}`}
        >
          <span className="w-5 text-center font-semibold text-muted">{row.rank}</span>
          <Avatar name={row.username} />
          <span className="min-w-0 flex-1 truncate text-ink">
            {row.username}
            {row.is_you && <span className="ml-1 text-xs text-muted">(you)</span>}
          </span>
          <span className="font-medium text-ink">{row.solved} solved</span>
        </li>
      ))}
    </ol>
  )
}
