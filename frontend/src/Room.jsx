import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { API } from './api'

const LANGUAGES = ['python', 'java', 'c', 'cpp', 'javascript']

export default function Room({ room, user, token }) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [status, setStatus] = useState('connecting') // connecting | connected | disconnected | notfound | unauth
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [ok, setOk] = useState(true)
  const [copied, setCopied] = useState(false)
  const wsRef = useRef(null)
  const lastRemote = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8000/ws/${encodeURIComponent(room)}?token=${token}`
    )
    ws.onopen = () => setStatus('connected')
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      lastRemote.current = msg.code
      setCode(msg.code)
      setLanguage(msg.language)
    }
    ws.onclose = (e) => {
      if (e.code === 4404) setStatus('notfound')
      else if (e.code === 4401) setStatus('unauth')
      else setStatus('disconnected')
    }
    wsRef.current = ws
    return () => {
      ws.onclose = null // cleanup la close aagum bodhu status maaraama irukka
      ws.close()
    }
  }, [room, token])

  const send = (newCode, newLang) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ code: newCode, language: newLang }))
    }
  }

  const handleCodeChange = (value) => {
    const v = value ?? ''
    if (v === lastRemote.current) return
    setCode(v)
    send(v, language)
  }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    send(code, lang)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('Running...')
    try {
      const res = await fetch(`${API}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language, code }),
      })
      if (res.status === 401) {
        setOutput('Session expire aagiduchu. Thirumba login pannunga.')
        setOk(false)
      } else {
        const data = await res.json()
        setOutput(data.output)
        setOk(data.ok)
      }
    } catch {
      setOutput('Backend connect aagala. uvicorn run aagudha nu paarunga.')
      setOk(false)
    }
    setRunning(false)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">Room "{room}" illa. Code sariya nu paarunga.</p>
        <a href="/" className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded">
          Home ku po
        </a>
      </div>
    )
  }

  if (status === 'unauth') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">Session expire aagiduchu. Thirumba login pannunga.</p>
        <button
          onClick={() => {
            localStorage.removeItem('token')
            window.location.href = '/'
          }}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded"
        >
          Login
        </button>
      </div>
    )
  }

  const statusColor =
    status === 'connected'
      ? 'text-green-400'
      : status === 'connecting'
      ? 'text-yellow-400'
      : 'text-red-400'

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            <a href="/" className="hover:underline">CodeRoom</a>
          </h1>
          <p className="text-gray-400 text-sm">
            Room: {room} · {user.username} ·{' '}
            <span className={statusColor}>{status}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyLink}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded"
          >
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={status !== 'connected'}
            className="bg-gray-800 px-3 py-2 rounded"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={runCode}
            disabled={running || status !== 'connected'}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-5 py-2 rounded font-medium"
          >
            {running ? 'Running...' : '▶ Run'}
          </button>
        </div>
      </div>

      {status === 'disconnected' && (
        <p className="text-red-400 text-sm mb-2">
          Connection poiduchu. Page refresh pannunga.
        </p>
      )}

      <Editor
        height="55vh"
        theme="vs-dark"
        language={language}
        value={code}
        onChange={handleCodeChange}
        options={{
          fontSize: 15,
          minimap: { enabled: false },
          readOnly: status !== 'connected',
        }}
      />

      <div className="mt-4">
        <p className="text-sm text-gray-400 mb-1">Output</p>
        <pre
          className={`bg-gray-800 rounded p-4 h-40 overflow-auto font-mono text-sm whitespace-pre-wrap ${
            ok ? 'text-gray-100' : 'text-red-400'
          }`}
        >
          {output || 'Run button click pannunga...'}
        </pre>
      </div>
    </div>
  )
}