import { useState } from 'react'
import { api } from './api'

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const data =
        mode === 'login'
          ? await api('/login', { method: 'POST', body: { username, password } })
          : await api('/register', {
              method: 'POST',
              body: { username, email, password },
            })
      onAuth(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const input =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-3 outline-none focus:border-blue-500'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gray-800/50 p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-1">CodeRoom</h1>
        <p className="text-gray-400 mb-6">
          {mode === 'login' ? 'Login pannunga' : 'Puthu account create pannunga'}
        </p>

        <input
          className={input}
          placeholder={mode === 'login' ? 'Username illa email' : 'Username'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {mode === 'register' && (
          <input
            className={input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <input
          className={input}
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded font-medium"
        >
          {loading ? 'Wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        <p className="text-sm text-gray-400 mt-4 text-center">
          {mode === 'login' ? 'Account illaya? ' : 'Already account irukka? '}
          <button
            className="text-blue-400 hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}