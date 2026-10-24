import { useState } from 'react'
import { Check, Link2, Wifi, WifiOff } from 'lucide-react'
import Avatar from './Avatar'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'
import Timer from './Timer'
import { ghostButton } from '../lib/ui'

const STATUS = {
  connected: { label: 'Live', icon: Wifi, tone: 'text-success' },
  connecting: { label: 'Connecting', icon: Wifi, tone: 'text-warning' },
  reconnecting: { label: 'Reconnecting', icon: WifiOff, tone: 'text-warning' },
  disconnected: { label: 'Offline', icon: WifiOff, tone: 'text-danger' },
}

export default function RoomHeader({
  roomId,
  title,
  isHost,
  onTitleChange,
  users,
  timer,
  onTimerAction,
  onTimerExpire,
  status,
}) {
  const [copied, setCopied] = useState(false)
  const { label, icon: StatusIcon, tone } = STATUS[status] || STATUS.disconnected
  const visibleUsers = users.slice(0, 4)

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel px-4 py-2.5">
      <a href="/" aria-label="Back to dashboard">
        <Brand />
      </a>
      <span className="hidden h-6 w-px bg-line sm:block" />

      <div className="flex min-w-0 items-center gap-3">
        {isHost ? (
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={80}
            aria-label="Room title"
            className="w-48 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink hover:border-line focus:border-brand focus:outline-none"
          />
        ) : (
          <h1 className="truncate text-sm font-medium text-ink">{title}</h1>
        )}
        <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-muted">{roomId}</span>
        <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {label}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <div className="flex items-center" aria-label={`${users.length} online`}>
          <div className="flex -space-x-2">
            {visibleUsers.map((u) => (
              <Avatar key={u.id} name={u.username} ring />
            ))}
          </div>
          {users.length > visibleUsers.length && (
            <span className="ml-2 text-xs text-muted">+{users.length - visibleUsers.length}</span>
          )}
        </div>
        <Timer timer={timer} isHost={isHost} onAction={onTimerAction} onExpire={onTimerExpire} />
        <button onClick={copyInviteLink} className={ghostButton}>
          {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
          {copied ? 'Copied' : 'Invite'}
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
