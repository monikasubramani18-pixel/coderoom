import { useState } from 'react'

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8)
}

export default function Home({ user, onLogout }) {
  const [code, setCode] = useState('')

  const goToRoom = (id) => {
    window.location.href = `/?room=${encodeURIComponent(id)}`
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
            onClick={() => goToRoom(randomRoomId())}
            className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded font-medium"
          >
            Create Room
          </button>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-lg">
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
      </div>
    </div>
  )
}