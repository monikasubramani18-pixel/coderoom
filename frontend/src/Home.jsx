import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Flame, FolderOpen, Link2, LogOut, Plus, Target, Trash2, Trophy } from 'lucide-react'
import { api } from './api'
import ActivityHeatmap from './components/ActivityHeatmap'
import Avatar from './components/Avatar'
import Brand from './components/Brand'
import ConfirmDialog from './components/ConfirmDialog'
import Leaderboard from './components/Leaderboard'
import ProblemList from './components/ProblemList'
import ThemeToggle from './components/ThemeToggle'
import TopicProgress from './components/TopicProgress'
import { timeAgo } from './lib/format'
import { languageMeta } from './lib/languages'
import { DIFFICULTY_STYLES, PROBLEMS, buildQuestionText, computeStreak } from './lib/problems'
import { card, ghostButton, iconButton, inputClass, primaryButton } from './lib/ui'
import useDocumentTitle from './lib/useDocumentTitle'

const goToRoom = (id) => {
  window.location.href = `/?room=${encodeURIComponent(id)}`
}

function RoomsSkeleton() {
  return (
    <ul className="divide-y divide-line" aria-label="Loading rooms">
      {[0, 1, 2].map((i) => (
        <li key={i} className="space-y-2 px-5 py-4">
          <div className="h-4 w-1/2 animate-pulse rounded bg-raised" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-raised" />
        </li>
      ))}
    </ul>
  )
}

function Stat({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className={`${card} flex items-center gap-4 p-5`}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg bg-raised ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">
          {label}
          {detail && <span> · {detail}</span>}
        </p>
      </div>
    </div>
  )
}

export default function Home({ user, token, onLogout }) {
  useDocumentTitle('Dashboard')

  const [title, setTitle] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [rooms, setRooms] = useState(null) // null = loading
  const [progress, setProgress] = useState({ problems: [], activity: [] })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [startingProblem, setStartingProblem] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState(null)
  const [copiedRoomId, setCopiedRoomId] = useState(null)

  useEffect(() => {
    api('/rooms', { token })
      .then(setRooms)
      .catch((err) => {
        setRooms([])
        setError(err.message)
      })
    api('/progress', { token })
      .then(setProgress)
      .catch(() => {}) // progress is optional; the dashboard still works without it
  }, [token])

  const { solvedIds, attemptedIds, attempts, streak } = useMemo(
    () => ({
      solvedIds: new Set(progress.problems.filter((p) => p.solved).map((p) => p.problem_id)),
      attemptedIds: new Set(progress.problems.map((p) => p.problem_id)),
      attempts: progress.problems.reduce((sum, p) => sum + p.attempts, 0),
      streak: computeStreak(progress.activity),
    }),
    [progress]
  )

  // Same problem for everyone on a given (UTC) day.
  const dailyProblem = useMemo(() => PROBLEMS[Math.floor(Date.now() / 86_400_000) % PROBLEMS.length], [])

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

  const startPractice = async (problem) => {
    setError('')
    setStartingProblem(true)
    try {
      const room = await api('/rooms', {
        method: 'POST',
        token,
        body: {
          title: problem.title,
          problem_id: problem.id,
          question: buildQuestionText(problem),
          code: problem.starter,
          language: 'python',
        },
      })
      goToRoom(room.id)
    } catch (err) {
      setError(err.message)
      setStartingProblem(false)
    }
  }

  const copyRoomLink = async (room) => {
    await navigator.clipboard.writeText(`${window.location.origin}/?room=${room.id}`)
    setCopiedRoomId(room.id)
    setTimeout(() => setCopiedRoomId(null), 1500)
  }

  const joinRoom = (event) => {
    event.preventDefault()
    if (joinCode.trim()) goToRoom(joinCode.trim())
  }

  const confirmDelete = async () => {
    const room = roomToDelete
    setRoomToDelete(null)
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

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Your progress">
          <Stat icon={Trophy} label="Problems solved" value={`${solvedIds.size} / ${PROBLEMS.length}`} tone="text-warning" />
          <Stat icon={Target} label="Test runs" value={attempts} tone="text-brand" />
          <Stat
            icon={Flame}
            label="Day streak"
            value={streak}
            detail={streak === 0 ? 'run tests today to start' : undefined}
            tone="text-danger"
          />
        </section>

        <section className={`${card} flex flex-wrap items-center gap-4 p-5`} aria-label="Problem of the day">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-raised text-brand">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted">Problem of the day</p>
            <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
              {dailyProblem.title}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLES[dailyProblem.difficulty]}`}>
                {dailyProblem.difficulty}
              </span>
              <span className="text-xs font-normal text-muted">{dailyProblem.topic}</span>
            </p>
          </div>
          <button onClick={() => startPractice(dailyProblem)} disabled={startingProblem} className={primaryButton}>
            {solvedIds.has(dailyProblem.id) ? 'Solve again' : 'Solve now'}
          </button>
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className={`${card} p-5 lg:col-span-3`} aria-label="Activity">
            <h2 className="mb-4 font-semibold">Your activity</h2>
            <ActivityHeatmap timestamps={progress.activity} />
          </section>
          <section className={`${card} p-5 lg:col-span-2`} aria-label="Leaderboard">
            <h2 className="mb-3 font-semibold">Leaderboard</h2>
            <Leaderboard token={token} />
          </section>
        </div>

        <section className={`${card} p-5`} aria-label="Progress by topic">
          <h2 className="mb-4 font-semibold">Progress by topic</h2>
          <TopicProgress solvedIds={solvedIds} />
        </section>

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <form onSubmit={createRoom} className={`${card} p-5`}>
              <h2 className="mb-1 font-semibold">New room</h2>
              <p className="mb-4 text-sm text-muted">Start a session and share the invite link.</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Room title (e.g. Mock interview: arrays)"
                aria-label="Room title"
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
                  aria-label="Room code"
                  className={inputClass}
                />
                <button type="submit" disabled={!joinCode.trim()} className={primaryButton} aria-label="Join room">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          <section className={`${card} lg:col-span-3`}>
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold">Your rooms</h2>
            </div>
            {rooms === null ? (
              <RoomsSkeleton />
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <FolderOpen className="h-8 w-8 text-muted" />
                <p className="text-sm text-muted">No rooms yet. Create one or start a practice problem below.</p>
              </div>
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
                      onClick={() => copyRoomLink(room)}
                      className={iconButton}
                      aria-label={`Copy invite link for ${room.title}`}
                      title="Copy invite link"
                    >
                      {copiedRoomId === room.id ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setRoomToDelete(room)}
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
        </div>

        <section className={card} aria-label="Practice problems">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Practice problems</h2>
            <p className="text-sm text-muted">
              Each problem opens a private room with test cases, hints and a worked approach. Invite a friend to solve it together.
            </p>
          </div>
          <ProblemList
            solvedIds={solvedIds}
            attemptedIds={attemptedIds}
            actionLabel="Solve"
            onSelect={startPractice}
            disabled={startingProblem}
          />
        </section>
      </main>

      <ConfirmDialog
        open={Boolean(roomToDelete)}
        title="Delete room?"
        message={roomToDelete ? `"${roomToDelete.title}" and its feedback will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setRoomToDelete(null)}
      />
    </div>
  )
}
