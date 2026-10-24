import { useEffect, useState } from 'react'
import { Clock, Pause, Play, RotateCcw } from 'lucide-react'
import { formatClock } from '../lib/format'
import { iconButton } from '../lib/ui'

const PRESET_MINUTES = [15, 30, 45, 60, 90]

/**
 * Shared interview timer. The server owns the clock; each client counts down
 * locally from the snapshot it last received (`timer.receivedAt`).
 */
export default function Timer({ timer, isHost, onAction, onExpire }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer.running) return undefined
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [timer.running])

  const elapsed = timer.running ? Math.max(0, Math.floor((now - timer.receivedAt) / 1000)) : 0
  const remaining = Math.max(0, timer.remaining - elapsed)
  const expired = timer.duration > 0 && remaining === 0
  const urgent = timer.running && remaining <= 300

  // Fires once, when a running timer reaches zero.
  useEffect(() => {
    if (timer.running && expired) onExpire?.()
  }, [timer.running, expired, onExpire])

  const tone = expired ? 'text-danger' : urgent ? 'text-warning' : 'text-ink'
  const durationMinutes = Math.round(timer.duration / 60)
  const options = PRESET_MINUTES.includes(durationMinutes)
    ? PRESET_MINUTES
    : [...PRESET_MINUTES, durationMinutes].sort((a, b) => a - b)

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 font-mono text-sm tabular-nums ${tone}`}
        title={expired ? 'Time is up' : 'Interview timer'}
      >
        <Clock className="h-4 w-4" />
        {formatClock(remaining)}
      </div>

      {isHost && (
        <>
          <button
            onClick={() => onAction(timer.running ? 'pause' : 'start')}
            disabled={expired}
            className={iconButton}
            aria-label={timer.running ? 'Pause timer' : 'Start timer'}
            title={timer.running ? 'Pause' : 'Start'}
          >
            {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onAction('reset')}
            className={iconButton}
            aria-label="Reset timer"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <select
            value={durationMinutes}
            onChange={(e) => onAction('reset', Number(e.target.value))}
            className="h-9 rounded-md border border-line bg-panel px-2 text-sm text-ink"
            aria-label="Timer duration"
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
