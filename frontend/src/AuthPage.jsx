import { useState } from 'react'
import { Clock, Play, Users } from 'lucide-react'
import { api } from './api'
import Brand from './components/Brand'
import ThemeToggle from './components/ThemeToggle'
import { inputClass, primaryButton } from './lib/ui'
import useDocumentTitle from './lib/useDocumentTitle'

const FEATURES = [
  { icon: Users, title: 'Real-time collaboration', text: 'Edit code together with live presence and chat.' },
  { icon: Play, title: 'Sandboxed execution', text: 'Run Python, Java, C, C++ and JavaScript in isolated containers.' },
  { icon: Clock, title: 'Built for interviews', text: 'Shared question, timer, private notes and structured feedback.' },
]

function Field({ label, ...props }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  )
}

export default function AuthPage({ onAuth }) {
  useDocumentTitle('Sign in')

  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = isLogin ? { username, password } : { username, email, password }
      onAuth(await api(isLogin ? '/login' : '/register', { method: 'POST', body }))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-line bg-panel p-12 lg:flex">
        <Brand size="lg" />
        <div className="space-y-8">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-ink">
            Practice interviews and pair-program in real time.
          </h2>
          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">FastAPI · React · PostgreSQL · Docker</p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand size="lg" />
          </div>
          <h1 className="mb-1 text-2xl font-semibold text-ink">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mb-6 text-sm text-muted">
            {isLogin ? 'Sign in to continue to CodeRoom.' : 'Start collaborating in under a minute.'}
          </p>

          <Field
            label={isLogin ? 'Username or email' : 'Username'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          {!isLogin && (
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          )}
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder={isLogin ? '' : 'At least 6 characters'}
            required
          />

          {error && (
            <p role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? 'New to CodeRoom? ' : 'Already have an account? '}
            <button type="button" onClick={switchMode} className="font-medium text-brand hover:underline">
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
