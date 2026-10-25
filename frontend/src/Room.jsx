import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Check, Command, Copy, Download, FileDown, FlaskConical, Loader2, Mic, MicOff, Play, Video, VideoOff } from 'lucide-react'
import { WS_URL, api } from './api'
import CameraConsentDialog from './components/CameraConsentDialog'
import CommandPalette from './components/CommandPalette'
import Console from './components/Console'
import EditorSettings from './components/EditorSettings'
import ProblemPicker from './components/ProblemPicker'
import RoomHeader from './components/RoomHeader'
import SidePanel from './components/SidePanel'
import { useToast } from './components/Toast'
import VideoDock from './components/VideoDock'
import { useEditorSettings } from './lib/editorSettings'
import { exportSession } from './lib/exportSession'
import { LANGUAGES, TEMPLATES, languageMeta } from './lib/languages'
import { buildQuestionText, getProblem } from './lib/problems'
import { ghostButton, iconButton, primaryButton } from './lib/ui'
import useAttention from './lib/useAttention'
import useDocumentTitle from './lib/useDocumentTitle'
import useVideoCall from './lib/useVideoCall'
import { useTheme } from './theme'

const MAX_RECONNECT_ATTEMPTS = 5
const MAX_HISTORY = 20
const MOD_KEY = /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

function FullScreenMessage({ title, actionLabel, onAction, href }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas text-ink">
      <p className="text-lg">{title}</p>
      {href ? (
        <a href={href} className={primaryButton}>
          {actionLabel}
        </a>
      ) : (
        <button onClick={onAction} className={primaryButton}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default function Room({ roomId, token, onSessionExpired }) {
  const { theme, toggleTheme } = useTheme()
  const { notify } = useToast()
  const [editorSettings, setEditorSettings] = useEditorSettings()

  const [status, setStatus] = useState('connecting') // connecting | connected | reconnecting | disconnected | not_found | unauthorized
  const [me, setMe] = useState(null)
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [question, setQuestion] = useState('')
  const [problemId, setProblemId] = useState(null)
  const [users, setUsers] = useState([])
  const [chat, setChat] = useState([])
  const [timer, setTimer] = useState({ running: false, remaining: 0, duration: 0, receivedAt: Date.now() })
  const [result, setResult] = useState(null)
  const [runError, setRunError] = useState('')
  const [running, setRunning] = useState(false)
  const [stdin, setStdin] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testsError, setTestsError] = useState('')
  const [testsRunning, setTestsRunning] = useState(false)
  const [history, setHistory] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [shareAttention, setShareAttention] = useState(true)

  const socketRef = useRef(null)
  const lastRemoteCode = useRef(null)
  const questionTimer = useRef(null)
  const runRef = useRef(null)
  const meRef = useRef(null) // latest identity, readable from the socket handlers
  const usersRef = useRef(null) // previous presence list, used to announce joins and leaves
  const previousStatus = useRef('connecting')
  const signalHandlerRef = useRef(null) // set by useVideoCall to handle WebRTC signalling
  const localVideoRef = useRef(null) // the local <video>, also read by the attention tracker

  const problem = getProblem(problemId)
  useDocumentTitle(title)

  // ----- WebSocket lifecycle (with exponential-backoff reconnect) -----
  useEffect(() => {
    let attempts = 0
    let disposed = false
    let retryTimer
    let historySeq = 0

    const addHistory = (entry) =>
      setHistory((current) => [{ id: `h${historySeq++}`, ts: Date.now(), ...entry }, ...current].slice(0, MAX_HISTORY))

    const handleMessage = (message) => {
      switch (message.type) {
        case 'init':
          meRef.current = message.you
          usersRef.current = message.users
          setMe(message.you)
          setTitle(message.room.title)
          lastRemoteCode.current = message.room.code
          setCode(message.room.code)
          setLanguage(message.room.language)
          setQuestion(message.room.question)
          setProblemId(message.room.problem_id ?? null)
          setChat(message.chat)
          setTimer({ ...message.timer, receivedAt: Date.now() })
          setUsers(message.users)
          break
        case 'code':
          lastRemoteCode.current = message.code
          setCode(message.code)
          setLanguage(message.language)
          break
        case 'question':
          setQuestion(message.text)
          break
        case 'problem':
          setProblemId(message.problem_id)
          setQuestion(message.question)
          setTestResult(null)
          break
        case 'title':
          setTitle(message.title)
          break
        case 'presence': {
          const previous = usersRef.current || []
          const before = new Set(previous.map((u) => u.id))
          const after = new Set(message.users.map((u) => u.id))
          message.users
            .filter((u) => !before.has(u.id) && u.id !== meRef.current?.id)
            .forEach((u) => notify(`${u.username} joined the room`))
          previous.filter((u) => !after.has(u.id)).forEach((u) => notify(`${u.username} left the room`))
          usersRef.current = message.users
          setUsers(message.users)
          break
        }
        case 'chat':
          setChat((current) => [...current.slice(-49), message.message])
          break
        case 'timer':
          setTimer({
            running: message.running,
            remaining: message.remaining,
            duration: message.duration,
            receivedAt: Date.now(),
          })
          break
        case 'run_result': {
          const run = message.result
          setRunError('')
          setResult(run)
          addHistory({
            kind: 'run',
            label: run.ok ? 'Run succeeded' : 'Run failed',
            ok: run.ok,
            by: run.by,
            output: run.output,
          })
          if (run.by !== meRef.current?.username) notify(`${run.by} ran the code`, run.ok ? 'info' : 'warning')
          break
        }
        case 'tests_result': {
          const tests = message.result
          const allPassed = tests.passed === tests.total
          setTestsError('')
          setTestResult(tests)
          addHistory({
            kind: 'tests',
            label: `Tests: ${tests.passed} / ${tests.total} passed`,
            ok: allPassed,
            by: tests.by,
            output: '',
          })
          if (tests.by !== meRef.current?.username) {
            notify(`${tests.by} ran tests: ${tests.passed} / ${tests.total} passed`, allPassed ? 'success' : 'info')
          }
          break
        }
        case 'rtc':
          signalHandlerRef.current?.(message)
          break
        default:
          break
      }
    }

    const connect = () => {
      const socket = new WebSocket(
        `${WS_URL}/ws/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`
      )
      socketRef.current = socket

      socket.onopen = () => {
        attempts = 0
        setStatus('connected')
      }
      socket.onmessage = (event) => handleMessage(JSON.parse(event.data))
      socket.onclose = (event) => {
        if (disposed) return
        if (event.code === 4404) return setStatus('not_found')
        if (event.code === 4401) return setStatus('unauthorized')
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          attempts += 1
          setStatus('reconnecting')
          retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts, 8000))
        } else {
          setStatus('disconnected')
        }
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socketRef.current?.close()
    }
  }, [roomId, token, notify])

  useEffect(() => () => clearTimeout(questionTimer.current), [])

  // Tell the user when the connection drops and when it comes back.
  useEffect(() => {
    const previous = previousStatus.current
    previousStatus.current = status
    if (status === 'reconnecting' && previous === 'connected') notify('Connection lost. Reconnecting...', 'warning')
    if (status === 'connected' && previous === 'reconnecting') notify('Back online', 'success')
  }, [status, notify])

  // Ctrl/Cmd + K opens the command palette. Capture phase, so it also works while the editor has focus.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        event.stopPropagation()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const isSocketOpen = () => socketRef.current?.readyState === WebSocket.OPEN

  const send = (payload) => {
    if (isSocketOpen()) socketRef.current.send(JSON.stringify(payload))
  }

  // ----- video call and attention (hooks must stay above the early returns below) -----
  const isConnected = status === 'connected'
  const call = useVideoCall({ me, users, connected: isConnected, send, signalHandlerRef })
  const attention = useAttention({
    enabled: Boolean(call.localStream) && shareAttention,
    videoRef: localVideoRef,
    connected: isConnected,
    send,
  })

  // ----- editor -----
  const handleCodeChange = (value) => {
    const next = value ?? ''
    if (next === lastRemoteCode.current) return // echo of a remote update
    lastRemoteCode.current = null
    setCode(next)
    send({ type: 'code', code: next, language })
  }

  const isUntouched = (text) => text.trim() === '' || Object.values(TEMPLATES).includes(text)

  const handleLanguageChange = (nextLanguage) => {
    // Swap the starter template unless the user has written their own code.
    const nextCode = isUntouched(code) ? TEMPLATES[nextLanguage] : code
    lastRemoteCode.current = null
    setLanguage(nextLanguage)
    setCode(nextCode)
    send({ type: 'code', code: nextCode, language: nextLanguage })
  }

  const handleRun = async () => {
    if (running || !isSocketOpen()) return
    setRunning(true)
    setRunError('')
    try {
      setResult(await api('/run', { method: 'POST', token, body: { language, code, stdin, room_id: roomId } }))
    } catch (error) {
      setRunError(error.message)
    } finally {
      setRunning(false)
    }
  }

  const handleRunTests = async () => {
    if (!problem || testsRunning || !isSocketOpen()) return
    setTestsRunning(true)
    setTestsError('')
    try {
      const cases = problem.tests.map(({ input, expected }) => ({ input, expected }))
      setTestResult(
        await api('/run/tests', {
          method: 'POST',
          token,
          body: { language, code, cases, problem_id: problem.id, room_id: roomId },
        })
      )
    } catch (error) {
      setTestsError(error.message)
    } finally {
      setTestsRunning(false)
    }
  }

  // Keep a ref to the latest handler so the editor shortcut never runs with stale state.
  useEffect(() => {
    runRef.current = handleRun
  })

  const handleEditorMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.())
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    notify('Invite link copied', 'success')
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = languageMeta(language).filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = () =>
    exportSession({ title, roomId, language, question, code, runResult: result, testResult, chat, users })

  // ----- room-level actions -----
  const handleTitleChange = (value) => {
    setTitle(value)
    send({ type: 'title', title: value })
  }

  const handleQuestionChange = (text) => {
    setQuestion(text)
    clearTimeout(questionTimer.current)
    questionTimer.current = setTimeout(() => send({ type: 'question', text }), 400)
  }

  const handleSelectProblem = (selected) => {
    const text = buildQuestionText(selected)
    setProblemId(selected.id)
    setQuestion(text)
    setTestResult(null)
    send({ type: 'problem', problem_id: selected.id, question: text })

    if (isUntouched(code)) {
      lastRemoteCode.current = null
      setLanguage('python')
      setCode(selected.starter)
      send({ type: 'code', code: selected.starter, language: 'python' })
    }
    setPickerOpen(false)
  }

  const handleClearProblem = () => {
    setProblemId(null)
    setTestResult(null)
    send({ type: 'problem', problem_id: null, question })
  }

  const handleTimerAction = (action, minutes) => send({ type: 'timer', action, minutes })
  const handleTimerExpire = useCallback(() => notify('Time is up!', 'warning'), [notify])
  const handleSendChat = (text) => send({ type: 'chat', text })

  const handleToggleCamera = () => (call.localStream ? call.stopCamera() : setConsentOpen(true))
  const handleConfirmCamera = async () => {
    setConsentOpen(false)
    const problemMessage = await call.startCamera()
    if (problemMessage) notify(problemMessage, 'danger')
  }

  // ----- terminal states -----
  if (status === 'not_found') {
    return <FullScreenMessage title={`Room "${roomId}" does not exist.`} actionLabel="Back to dashboard" href="/" />
  }
  if (status === 'unauthorized') {
    return <FullScreenMessage title="Your session has expired." actionLabel="Sign in again" onAction={onSessionExpired} />
  }
  if (!me) {
    return (
      <div className="flex h-full items-center justify-center gap-3 bg-canvas text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        {status === 'disconnected' ? 'Could not reach the server.' : 'Connecting to room...'}
      </div>
    )
  }

  const connected = status === 'connected'

  const commands = [
    { id: 'run', label: 'Run code', hint: `${MOD_KEY}+Enter`, run: handleRun },
    ...(problem ? [{ id: 'tests', label: 'Run tests', run: handleRunTests }] : []),
    { id: 'camera', label: call.localStream ? 'Turn camera off' : 'Turn camera on', run: handleToggleCamera },
    { id: 'invite', label: 'Copy invite link', run: handleCopyInviteLink },
    { id: 'copy', label: 'Copy code', run: handleCopyCode },
    { id: 'download', label: 'Download code', run: handleDownload },
    { id: 'export', label: 'Export session as Markdown', run: handleExport },
    { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, run: toggleTheme },
    ...LANGUAGES.map((l) => ({
      id: `language-${l.id}`,
      label: `Switch language to ${l.label}`,
      run: () => handleLanguageChange(l.id),
    })),
    ...(me.is_host
      ? [
          { id: 'problem', label: 'Choose a problem', run: () => setPickerOpen(true) },
          {
            id: 'timer',
            label: timer.running ? 'Pause timer' : 'Start timer',
            run: () => handleTimerAction(timer.running ? 'pause' : 'start'),
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <RoomHeader
        roomId={roomId}
        title={title}
        isHost={me.is_host}
        onTitleChange={handleTitleChange}
        users={users}
        timer={timer}
        onTimerAction={handleTimerAction}
        onTimerExpire={handleTimerExpire}
        status={status}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main className="flex min-h-[28rem] min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={!connected}
              aria-label="Language"
              className="h-9 rounded-md border border-line bg-raised px-2 text-sm text-ink"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button onClick={handleCopyCode} className={iconButton} aria-label="Copy code" title="Copy code">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={handleDownload} className={iconButton} aria-label="Download code" title="Download code">
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleExport}
              className={iconButton}
              aria-label="Export session as Markdown"
              title="Export session as Markdown notes"
            >
              <FileDown className="h-4 w-4" />
            </button>
            <EditorSettings settings={editorSettings} onChange={setEditorSettings} />
            <button
              onClick={() => setPaletteOpen(true)}
              className={iconButton}
              aria-label="Open command palette"
              title={`Command palette (${MOD_KEY}+K)`}
            >
              <Command className="h-4 w-4" />
            </button>
            <button
              onClick={handleToggleCamera}
              className={iconButton}
              aria-label={call.localStream ? 'Turn camera off' : 'Turn camera on'}
              aria-pressed={Boolean(call.localStream)}
              title={call.localStream ? 'Turn camera off' : 'Turn camera on'}
            >
              {call.localStream ? <Video className="h-4 w-4 text-success" /> : <VideoOff className="h-4 w-4" />}
            </button>
            {call.localStream && (
              <button
                onClick={call.toggleMic}
                className={iconButton}
                aria-label={call.micOn ? 'Mute microphone' : 'Unmute microphone'}
                title={call.micOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {call.micOn ? <Mic className="h-4 w-4 text-success" /> : <MicOff className="h-4 w-4" />}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {problem && (
                <button
                  onClick={handleRunTests}
                  disabled={testsRunning || !connected}
                  className={ghostButton}
                  title="Run all test cases"
                >
                  {testsRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  {testsRunning ? 'Judging' : 'Run tests'}
                </button>
              )}
              <button
                onClick={handleRun}
                disabled={running || !connected}
                title={`Run code (${MOD_KEY}+Enter)`}
                className={primaryButton}
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? 'Running' : 'Run'}
                <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-normal xl:inline">
                  {MOD_KEY}+Enter
                </kbd>
              </button>
            </div>
          </div>

          <VideoDock
            users={users}
            me={me}
            localStream={call.localStream}
            remoteStreams={call.remoteStreams}
            localVideoRef={localVideoRef}
            localStatus={attention.status}
            engine={attention.engine}
            shareAttention={shareAttention}
            onShareAttentionChange={setShareAttention}
          />

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                fontSize: editorSettings.fontSize,
                tabSize: editorSettings.tabSize,
                wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                minimap: { enabled: editorSettings.minimap },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: !connected,
                padding: { top: 12 },
              }}
            />
          </div>

          <Console
            result={result}
            error={runError}
            running={running}
            stdin={stdin}
            onStdinChange={setStdin}
            problem={problem}
            testResult={testResult}
            testsError={testsError}
            testsRunning={testsRunning}
            onRunTests={handleRunTests}
            history={history}
          />
        </main>

        <SidePanel
          roomId={roomId}
          token={token}
          me={me}
          question={question}
          onQuestionChange={handleQuestionChange}
          problem={problem}
          onOpenPicker={() => setPickerOpen(true)}
          onClearProblem={handleClearProblem}
          chat={chat}
          onSendChat={handleSendChat}
          connected={connected}
          code={code}
          language={language}
          lastOutput={result?.output ?? ''}
        />
      </div>

      <ProblemPicker open={pickerOpen} onSelect={handleSelectProblem} onClose={() => setPickerOpen(false)} />
      <CameraConsentDialog open={consentOpen} onConfirm={handleConfirmCamera} onCancel={() => setConsentOpen(false)} />
      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
