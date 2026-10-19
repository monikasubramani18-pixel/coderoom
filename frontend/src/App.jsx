import { useEffect, useState } from 'react'
import { api } from './api'
import AuthPage from './AuthPage'
import Home from './Home'
import Room from './Room'

const room = new URLSearchParams(window.location.search).get('room')

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('token'))

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  // Page open aagum bodhu saved token valid ah nu check
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api('/me', { token })
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [token])

  const handleAuth = (data) => {
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!token || !user) return <AuthPage onAuth={handleAuth} />
  if (room) return <Room room={room} user={user} token={token} />
  return <Home user={user} token={token} onLogout={logout} />
}

export default App