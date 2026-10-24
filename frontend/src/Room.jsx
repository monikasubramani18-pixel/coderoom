import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Check, Copy, Download, FileDown, FlaskConical, Loader2, Play } from 'lucide-react'
import { WS_URL, api } from './api'
import Console from './components/Console'
import ProblemPicker from './components/ProblemPicker'
import RoomHeader from './components/RoomHeader'
import SidePanel from './components/SidePanel'
import { exportSession } from './lib/exportSession'
import { LANGUAGES, TEMPLATES, languageMeta } from './lib/languages'
import { buildQuestionText, getProblem } from './lib/problems'
import { ghostButton, iconButton, primaryButton } from './lib/ui'
import useDocumentTitle from './lib/useDocumentTitle'
import { useTheme } from './theme'

const MAX_RECONNECT_ATTEMPTS = 5
const RUN_SHORTCUT = /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

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
  const { theme } = useTheme()

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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const socketRef = useRef(null)
  const lastRemoteCode = useRef(null)
  const questionTimer = useRef(null)
  const runRef = useRef(null)

  const problem = getProblem(problemId)
  useDocumentTitle(title)

  // ----- WebSocket lifecycle (with exponential-backoff reconnect) -----
  useEffect(() => {
    let attempts = 0
    let disposed = false
    let retryTimer

    const handleMessage = (message) => {
      switch (message.type) {
        case 'init':
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
        case 'presence':
          setUsers(message.users)
          break
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
        case 'run_result':
          setRunError('')
          setResult(message.result)
          break
        case 'tests_result':
          setTestsError('')
          setTestResult(message.result)
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
  }, [roomId, token])

  useEffect(() => () => clearTimeout(questionTimer.current), [])

  const isSocketOpen = () => socketRef.current?.readyState === WebSocket.OPEN

  const send = (payload) => {
    if (isSocketOpen()) socketRef.current.send(JSON.stringify(payload))
  }

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

  // Keep refs to the latest handlers so the editor shortcut never runs with stale state.
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
  const handleSendChat = (text) => send({ type: 'chat', text })

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
                title={`Run code (${RUN_SHORTCUT}+Enter)`}
                className={primaryButton}
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? 'Running' : 'Run'}
                <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-normal xl:inline">
                  {RUN_SHORTCUT}+Enter
                </kbd>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
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
        />
      </div>

      <ProblemPicker open={pickerOpen} onSelect={handleSelectProblem} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
