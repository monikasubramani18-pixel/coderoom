import { useEffect, useState } from 'react'
import { api } from './api'
import AuthPage from './AuthPage'
import Home from './Home'
import Room from './Room'
import { ThemeProvider } from './theme'

const TOKEN_KEY = 'token'
const roomId = new URLSearchParams(window.location.search).get('room')

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

  if (checking) {
    return <div className="flex h-full items-center justify-center bg-canvas text-muted">Loading...</div>
  }
  if (!token || !user) return <AuthPage onAuth={handleAuth} />
  if (roomId) return <Room roomId={roomId} token={token} onSessionExpired={logout} />
  return <Home user={user} token={token} onLogout={logout} />
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes />
    </ThemeProvider>
  )
}
