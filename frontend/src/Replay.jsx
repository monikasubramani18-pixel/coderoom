import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { ArrowLeft, CheckCircle2, FlaskConical, Library, LogIn, LogOut, Pause, Play, RotateCcw, Terminal, XCircle } from 'lucide-react'
import { api } from './api'
import Brand from './components/Brand'
import ThemeToggle from './components/ThemeToggle'
import { formatClock } from './lib/format'
import { getProblem } from './lib/problems'
import { FLOW_META } from './lib/flow'
import { buildFlowBands, buildTimeline, changedLines, computeInsights, durationOf, stateAt } from './lib/replay'
import { card, ghostButton, primaryButton } from './lib/ui'
import useDocumentTitle from './lib/useDocumentTitle'
import { useTheme } from './theme'

const TICK_MS = 100
const SPEEDS = [1, 2, 4, 8]

function describe(event) {
  const { kind, data } = event
  switch (kind) {
    case 'run':
      return { icon: data.ok ? CheckCircle2 : XCircle, tone: data.ok ? 'text-success' : 'text-danger', text: `Run ${data.ok ? 'succeeded' : 'failed'} (${data.duration_ms} ms)` }
    case 'tests':
      return { icon: FlaskConical, tone: data.passed === data.total ? 'text-success' : 'text-warning', text: `Tests ${data.passed} / ${data.total} passed` }
    case 'join':
      return { icon: LogIn, tone: 'text-muted', text: `${data.username} joined` }
    case 'leave':
      return { icon: LogOut, tone: 'text-muted', text: `${data.username} left` }
    case 'problem':
      return { icon: Library, tone: 'text-brand', text: `Problem: ${getProblem(data.problem_id)?.title ?? data.problem_id ?? 'removed'}` }
    default:
      return { icon: Terminal, tone: 'text-muted', text: kind }
  }
}

function Insight({ label, value }) {
  return (
    <div className="rounded-md bg-raised px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  )
}

export default function Replay({ roomId, token }) {
  const { theme } = useTheme()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [editorReady, setEditorReady] = useState(false)

  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const decorationsRef = useRef(null)

  useDocumentTitle(data ? `Replay: ${data.room.title}` : 'Replay')

  useEffect(() => {
    api(`/rooms/${encodeURIComponent(roomId)}/replay`, { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [roomId, token])

  const timeline = useMemo(() => buildTimeline(data?.events ?? []), [data])
  const duration = durationOf(timeline)
  const insights = useMemo(() => computeInsights(data?.events ?? []), [data])
  const state = useMemo(() => stateAt(timeline, position), [timeline, position])
  const before = useMemo(() => stateAt(timeline, Math.max(0, position - 1500)).code, [timeline, position])
  const marks = useMemo(() => timeline.filter((event) => event.kind !== 'code' && event.kind !== 'flow'), [timeline])
  const bands = useMemo(() => buildFlowBands(timeline), [timeline])

  // Advance the playback clock.
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      setPosition((current) => {
        const next = current + TICK_MS * speed
        if (next >= duration) {
          setPlaying(false)
          return duration
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing, speed, duration])

  // Highlight the lines that changed during the last moments of playback.
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editorReady || !editor || !monaco) return
    decorationsRef.current?.clear()
    const decorations = changedLines(before, state.code)
      .slice(0, 300)
      .map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, className: 'replay-changed' },
      }))
    decorationsRef.current = editor.createDecorationsCollection(decorations)
  }, [editorReady, before, state.code])

  const togglePlay = () => {
    if (!playing && position >= duration) setPosition(0) // replay from the start once finished
    setPlaying((value) => !value)
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas text-ink">
        <p className="text-lg">{error}</p>
        <a href="/" className={primaryButton}>
          Back to dashboard
        </a>
      </div>
    )
  }
  if (!data) return <div className="flex h-full items-center justify-center bg-canvas text-muted">Loading replay...</div>

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex items-center gap-4 border-b border-line bg-panel px-4 py-2.5">
        <a href="/" className="text-muted hover:text-ink" aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <Brand />
        <span className="hidden h-6 w-px bg-line sm:block" />
        <h1 className="truncate text-sm font-medium">Replay: {data.room.title}</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {timeline.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted">Nothing has been recorded for this room yet. Start a session and come back.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <main className="flex min-h-[26rem] min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language={state.language}
                value={state.code}
                onMount={(editor, monaco) => {
                  editorRef.current = editor
                  monacoRef.current = monaco
                  setEditorReady(true)
                }}
                options={{ readOnly: true, fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 12 } }}
              />
            </div>

            <div className="space-y-3 border-t border-line bg-panel px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className={primaryButton} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause className="h-4 w-4" /> : position >= duration ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? 'Pause' : position >= duration ? 'Replay' : 'Play'}
                </button>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Playback speed"
                  className="h-9 rounded-md border border-line bg-raised px-2 text-sm text-ink"
                >
                  {SPEEDS.map((value) => (
                    <option key={value} value={value}>
                      {value}x
                    </option>
                  ))}
                </select>
                <span className="font-mono text-sm tabular-nums text-muted">
                  {formatClock(position / 1000)} / {formatClock(duration / 1000)}
                </span>
                <span className="ml-auto text-xs text-muted">Long pauses are skipped</span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  aria-label="Playback position"
                  className="w-full accent-brand"
                />
                {duration > 0 &&
                  marks.map((event) => (
                    <span
                      key={event.id}
                      className={`pointer-events-none absolute top-6 h-2 w-0.5 ${event.kind === 'run' && !event.data.ok ? 'bg-danger' : 'bg-brand'}`}
                      style={{ left: `${(event.at / duration) * 100}%` }}
                    />
                  ))}
              </div>

              {bands.length > 0 && duration > 0 && (
                <div className="space-y-2 pt-1" aria-label="Pulse timeline">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Pulse</p>
                  {bands.map((band) => (
                    <div key={band.user} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-xs text-ink">{band.user}</span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-raised">
                        {band.segments.map((segment, index) => (
                          <span
                            key={index}
                            title={`${FLOW_META[segment.state].label}: ${formatClock(segment.realMs / 1000)}`}
                            className="absolute inset-y-0"
                            style={{
                              left: `${(segment.from / duration) * 100}%`,
                              width: `${Math.max(((segment.to - segment.from) / duration) * 100, 0.4)}%`,
                              backgroundColor: FLOW_META[segment.state].color,
                            }}
                          />
                        ))}
                      </div>
                      <span className="hidden w-40 shrink-0 text-right text-[11px] text-muted sm:block">
                        {['flow', 'stuck']
                          .filter((state) => band.totals[state])
                          .map((state) => `${FLOW_META[state].label} ${formatClock(band.totals[state] / 1000)}`)
                          .join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          <aside className="flex h-96 shrink-0 flex-col overflow-y-auto border-t border-line bg-panel lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
            <section className="border-b border-line p-4">
              <h2 className="mb-3 text-sm font-semibold">Session insights</h2>
              <div className="grid grid-cols-2 gap-2">
                <Insight label="Active time" value={formatClock(insights.activeMs / 1000)} />
                <Insight label="Code snapshots" value={insights.snapshots} />
                <Insight label="Runs" value={`${insights.runs} (${insights.failedRuns} failed)`} />
                <Insight label="Test runs" value={`${insights.testRuns}${insights.testRuns ? `, best ${Math.round(insights.bestTestRatio * 100)}%` : ''}`} />
                <Insight label="First run after" value={insights.firstRunAfterMs === null ? 'No runs' : formatClock(insights.firstRunAfterMs / 1000)} />
                <Insight label="Longest pause" value={formatClock(insights.longestPauseMs / 1000)} />
              </div>
              {insights.participants.length > 0 && (
                <p className="mt-3 text-xs text-muted">Participants: {insights.participants.join(', ')}</p>
              )}
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
              {marks.length === 0 ? (
                <p className="text-sm text-muted">No runs or other events were recorded.</p>
              ) : (
                <ul className={`${card} divide-y divide-line`}>
                  {marks.map((event) => {
                    const { icon: Icon, tone, text } = describe(event)
                    const active = event.id === timeline[state.eventIndex]?.id
                    return (
                      <li key={event.id}>
                        <button
                          onClick={() => setPosition(event.at)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${active ? 'bg-raised' : 'hover:bg-raised'}`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
                          <span className="min-w-0 flex-1 truncate">
                            {text}
                            {event.user && <span className="text-muted"> · {event.user}</span>}
                          </span>
                          <span className="font-mono text-xs text-muted">{formatClock(event.t / 1000)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button onClick={() => { setPosition(0); setPlaying(false) }} className={`${ghostButton} mt-3 w-full`}>
                Back to start
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
