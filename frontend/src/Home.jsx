import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, Plus, Trash2 } from 'lucide-react'
import { api } from './api'
import Avatar from './components/Avatar'
import Brand from './components/Brand'
import ThemeToggle from './components/ThemeToggle'
import { languageMeta } from './lib/languages'
import { timeAgo } from './lib/format'
import { card, ghostButton, iconButton, inputClass, primaryButton } from './lib/ui'

const goToRoom = (id) => {
  window.location.href = `/?room=${encodeURIComponent(id)}`
}

export default function Home({ user, token, onLogout }) {
  const [title, setTitle] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [rooms, setRooms] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api('/rooms', { token })
      .then(setRooms)
      .catch((err) => {
        setRooms([])
        setError(err.message)
      })
  }, [token])

  const createRoom = async (event) => {
    event.preventDefault()
    setError('')
    setCreating(true)
    try {
      const room = await api('/rooms', { method: 'POST', token, body: { title: title.trim() || 'Untitled room' } })
      goToRoom(room.id)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  const joinRoom = (event) => {
    event.preventDefault()
    if (joinCode.trim()) goToRoom(joinCode.trim())
  }

  const deleteRoom = async (room) => {
    if (!window.confirm(`Delete "${room.title}"? This cannot be undone.`)) return
    try {
      await api(`/rooms/${room.id}`, { method: 'DELETE', token })
      setRooms((current) => current.filter((r) => r.id !== room.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted">
              <Avatar name={user.username} />
              {user.username}
            </span>
            <ThemeToggle />
            <button onClick={onLogout} className={ghostButton}>
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={createRoom} className={`${card} p-5`}>
            <h2 className="mb-1 font-semibold">New room</h2>
            <p className="mb-4 text-sm text-muted">Start a session and share the invite link.</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Room title (e.g. Mock interview: arrays)"
              className={`${inputClass} mb-3`}
            />
            <button type="submit" disabled={creating} className={`${primaryButton} w-full`}>
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create room'}
            </button>
          </form>

          <form onSubmit={joinRoom} className={`${card} p-5`}>
            <h2 className="mb-1 font-semibold">Join a room</h2>
            <p className="mb-4 text-sm text-muted">Enter the room code you were given.</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Room code"
                className={inputClass}
              />
              <button type="submit" disabled={!joinCode.trim()} className={primaryButton} aria-label="Join room">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <section className={`${card} lg:col-span-3`}>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Your rooms</h2>
          </div>
          {rooms === null ? (
            <p className="p-5 text-sm text-muted">Loading...</p>
          ) : rooms.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">No rooms yet. Create your first one.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center gap-3 px-5 py-3">
                  <button onClick={() => goToRoom(room.id)} className="min-w-0 flex-1 text-left">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {room.title}
                      {room.active && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                          Live
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{room.id}</span> · {languageMeta(room.language).label} ·{' '}
                      {timeAgo(room.updated_at)}
                    </p>
                  </button>
                  <button onClick={() => goToRoom(room.id)} className={ghostButton}>
                    Open
                  </button>
                  <button
                    onClick={() => deleteRoom(room)}
                    className={`${iconButton} hover:text-danger`}
                    aria-label={`Delete ${room.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
