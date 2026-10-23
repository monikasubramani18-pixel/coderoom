import { useCallback, useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { api } from '../../api'
import { timeAgo } from '../../lib/format'
import { inputClass, primaryButton } from '../../lib/ui'

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="disabled:cursor-default"
        >
          <Star className={`h-5 w-5 ${n <= value ? 'fill-warning text-warning' : 'text-muted'}`} />
        </button>
      ))}
    </div>
  )
}

export default function FeedbackPanel({ roomId, token, meId }) {
  const [items, setItems] = useState([])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api(`/rooms/${roomId}/feedback`, { token })
      setItems(data)
      return data
    } catch {
      return []
    }
  }, [roomId, token])

  // Load once and pre-fill the form with the user's existing feedback, if any.
  useEffect(() => {
    load().then((data) => {
      const mine = data.find((f) => f.author_id === meId)
      if (mine) {
        setRating(mine.rating)
        setComment(mine.comment)
      }
    })
  }, [load, meId])

  const submit = async (event) => {
    event.preventDefault()
    if (!rating) {
      setMessage('Please choose a rating.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await api(`/rooms/${roomId}/feedback`, { method: 'PUT', token, body: { rating, comment } })
      await load()
      setMessage('Feedback saved.')
    } catch (error) {
      setMessage(error.message)
    }
    setSaving(false)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <form onSubmit={submit} className="space-y-3 border-b border-line p-4">
        <p className="text-sm font-medium text-ink">Your feedback</p>
        <Stars value={rating} onChange={setRating} />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What went well? What could be improved?"
          className={`${inputClass} resize-none`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{message}</span>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>

      <div className="space-y-3 p-4">
        <p className="text-sm font-medium text-ink">All feedback ({items.length})</p>
        {items.length === 0 && <p className="text-sm text-muted">No feedback yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-line bg-raised p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{item.author}</span>
              <span className="text-xs text-muted">{timeAgo(item.updated_at)}</span>
            </div>
            <Stars value={item.rating} />
            {item.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{item.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
