import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Check, Copy, Download, Loader2, Play } from 'lucide-react'
import { WS_URL, api } from './api'
import Console from './components/Console'
import RoomHeader from './components/RoomHeader'
import SidePanel from './components/SidePanel'
import { LANGUAGES, TEMPLATES, languageMeta } from './lib/languages'
import { ghostButton, primaryButton } from './lib/ui'
import { useTheme } from './theme'

const MAX_RECONNECT_ATTEMPTS = 5

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
  const [users, setUsers] = useState([])
  const [chat, setChat] = useState([])
  const [timer, setTimer] = useState({ running: false, remaining: 0, duration: 0, receivedAt: Date.now() })
  const [result, setResult] = useState(null)
  const [runError, setRunError] = useState('')
  const [running, setRunning] = useState(false)
  const [stdin, setStdin] = useState('')
  const [copied, setCopied] = useState(false)

  const socketRef = useRef(null)
  const lastRemoteCode = useRef(null)
  const questionTimer = useRef(null)

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

  const send = (payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
    }
  }

  // ----- editor -----
  const handleCodeChange = (value) => {
    const next = value ?? ''
    if (next === lastRemoteCode.current) return // echo of a remote update
    lastRemoteCode.current = null
    setCode(next)
    send({ type: 'code', code: next, language })
  }

  const handleLanguageChange = (nextLanguage) => {
    // Swap the starter template unless the user has written their own code.
    const isUntouched = code.trim() === '' || Object.values(TEMPLATES).includes(code)
    const nextCode = isUntouched ? TEMPLATES[nextLanguage] : code
    lastRemoteCode.current = null
    setLanguage(nextLanguage)
    setCode(nextCode)
    send({ type: 'code', code: nextCode, language: nextLanguage })
  }

  const handleRun = async () => {
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

  const handleTimerAction = (action, minutes) => send({ type: 'timer', action, minutes })
  const handleSendChat = (text) => send({ type: 'chat', text })

  // ----- terminal states -----
  if (status === 'not_found') {
    return <FullScreenMessage title={`Room "${roomId}" does not exist.`} actionLabel="Back to dashboard" href="/" />
  }
  if (status === 'unauthorized') {
    return (
      <FullScreenMessage
        title="Your session has expired."
        actionLabel="Sign in again"
        onAction={onSessionExpired}
      />
    )
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
            <button onClick={handleCopyCode} className={ghostButton}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleDownload} className={ghostButton}>
              <Download className="h-4 w-4" />
              Download
            </button>
            <button onClick={handleRun} disabled={running || !connected} className={`${primaryButton} ml-auto`}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Running' : 'Run'}
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              language={language}
              value={code}
              onChange={handleCodeChange}
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

          <Console result={result} error={runError} running={running} stdin={stdin} onStdinChange={setStdin} />
        </main>

        <SidePanel
          roomId={roomId}
          token={token}
          me={me}
          question={question}
          onQuestionChange={handleQuestionChange}
          chat={chat}
          onSendChat={handleSendChat}
          connected={connected}
        />
      </div>
    </div>
  )
}
