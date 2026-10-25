import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { FLOW_META } from '../lib/flow'
import { formatClock } from '../lib/format'

/**
 * Live coding pulse. The host sees everyone, guests only see their own pulse.
 * The state is computed on each person's device from how they type and run code.
 */
export default function PulseBar({ users, me, flowSince, localState, shareFlow, onShareFlowChange }) {
  const [, refresh] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => refresh((n) => n + 1), 5000) // keeps the "for 2:10" durations current
    return () => clearInterval(timer)
  }, [])

  const chips = users
    .filter((user) => me.is_host || user.id === me.id)
    .map((user) => ({ user, state: user.id === me.id ? (shareFlow ? localState : null) : user.flow }))
    .filter((chip) => chip.state)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-panel px-4 py-1.5 text-xs">
      <span
        className="inline-flex items-center gap-1.5 font-medium text-ink"
        title="Worked out on each device from typing speed, deletions and run results. Only the label is shared."
      >
        <Activity className="h-3.5 w-3.5 text-brand" />
        Pulse
      </span>

      {chips.length === 0 && (
        <span className="text-muted">{me.is_host ? 'Waiting for activity...' : 'Sharing is off.'}</span>
      )}
      {chips.map(({ user, state }) => {
        const meta = FLOW_META[state]
        const since = flowSince[user.id]?.since
        const urgent = state === 'stuck'
        return (
          <span
            key={user.id}
            title={`${user.username}: ${meta.tip}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${urgent ? 'border-danger/50 bg-danger/10' : 'border-line bg-raised'}`}
          >
            <span aria-hidden="true">{meta.emoji}</span>
            <span className="font-medium text-ink">{user.id === me.id ? 'You' : user.username}</span>
            <span style={{ color: meta.color }}>{meta.label}</span>
            {since && <span className="font-mono text-muted">{formatClock((Date.now() - since) / 1000)}</span>}
          </span>
        )
      })}

      <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-muted">
        <input
          type="checkbox"
          checked={shareFlow}
          onChange={(e) => onShareFlowChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-brand"
        />
        Share my pulse
      </label>
    </div>
  )
}
