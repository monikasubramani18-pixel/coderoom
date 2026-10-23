import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { inputClass } from '../../lib/ui'

const STATUS_TEXT = { saved: 'Saved', saving: 'Saving...', error: 'Could not save' }

export default function NotesPanel({ roomId, token }) {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('saved')
  const saveTimer = useRef(null)

  useEffect(() => {
    let active = true
    api(`/rooms/${roomId}/notes`, { token })
      .then((data) => {
        if (!active) return
        setNotes(data.notes)
        setLoaded(true)
      })
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [roomId, token])

  const handleChange = (value) => {
    setNotes(value)
    setStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await api(`/rooms/${roomId}/notes`, { method: 'PUT', token, body: { notes: value } })
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, 800)
  }

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Private to you. Never shown to other participants.</span>
        <span className={status === 'error' ? 'text-danger' : ''}>{STATUS_TEXT[status]}</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!loaded}
        maxLength={20000}
        placeholder="Observations, follow-up questions, scoring..."
        className={`${inputClass} flex-1 resize-none`}
      />
    </div>
  )
}
