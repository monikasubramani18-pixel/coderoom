import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { formatTime } from '../../lib/format'
import { inputClass, primaryButton } from '../../lib/ui'

export default function ChatPanel({ messages, meId, onSend, disabled }) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-sm text-muted">No messages yet. Say hello to the room.</p>
        )}
        {messages.map((message) => {
          const mine = message.user_id === meId
          return (
            <div key={message.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="mb-0.5 text-[11px] text-muted">
                {mine ? 'You' : message.user} · {formatTime(message.ts)}
              </span>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-brand text-white' : 'bg-raised text-ink'
                }`}
              >
                {message.text}
              </p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Type a message"
          className={inputClass}
          disabled={disabled}
        />
        <button type="submit" className={primaryButton} disabled={disabled || !draft.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
