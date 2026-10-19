import { useEffect, useState } from 'react'
import { api } from './api'

export default function Home({ user, token, onLogout }) {
  const [code, setCode] = useState('')
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api('/rooms', { token })
      .then(setRooms)
      .catch(() => {})
  }, [token])

  const goToRoom = (id) => {
    window.location.href = `/?room=${encodeURIComponent(id)}`
  }

  const createRoom = async () => {
    setError('')
    setCreating(true)
    try {
      const data = await api('/rooms', { method: 'POST', token })
      goToRoom(data.id)
    } catch (e) {
      setError(e.message)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold">CodeRoom</h1>
          <div className="text-sm text-gray-400">
            {user.username}{' '}
            <button onClick={onLogout} className="ml-3 text-red-400 hover:underline">
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Puthu room</h2>
          <p className="text-gray-400 text-sm mb-4">
            Room create panni link ah friend kitta share pannunga.
          </p>
          <button
            onClick={createRoom}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-5 py-2 rounded font-medium"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Room join pannunga</h2>
          <div className="flex gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && code && goToRoom(code)}
              placeholder="Room code"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 outline-none focus:border-blue-500"
            />
            <button
              onClick={() => code && goToRoom(code)}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded font-medium"
            >
              Join
            </button>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Un rooms</h2>
            <ul className="divide-y divide-gray-700">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-mono">{r.id}</span>
                    <span className="ml-3 text-xs text-gray-400">
                      {r.language}
                      {r.updated_at &&
                        ` · ${new Date(r.updated_at).toLocaleString()}`}
                    </span>
                  </div>
                  <button
                    onClick={() => goToRoom(r.id)}
                    className="text-blue-400 hover:underline text-sm"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}