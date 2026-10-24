import { Suspense, lazy, useEffect, useState } from 'react'
import { api } from './api'
import AuthPage from './AuthPage'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './Home'
import { ToastProvider } from './components/Toast'
import { ThemeProvider } from './theme'

// The room screen pulls in the Monaco editor, so load it only when needed.
const Room = lazy(() => import('./Room'))

const TOKEN_KEY = 'token'
const roomId = new URLSearchParams(window.location.search).get('room')

function LoadingScreen() {
  return <div className="flex h-full items-center justify-center bg-canvas text-muted">Loading...</div>
}

function Routes() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  // Validate a saved token when the app loads.
  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    api('/me', { token })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setChecking(false))
  }, [token])

  const handleAuth = ({ token: newToken, user: newUser }) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(newUser)
  }

  if (checking) return <LoadingScreen />
  if (!token || !user) return <AuthPage onAuth={handleAuth} />
  if (roomId) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Room roomId={roomId} token={token} onSessionExpired={logout} />
      </Suspense>
    )
  }
  return <Home user={user} token={token} onLogout={logout} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
