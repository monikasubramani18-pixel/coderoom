import { useState } from 'react'
import { ClipboardList, FileText, MessageSquare, Star } from 'lucide-react'
import ChatPanel from './panels/ChatPanel'
import FeedbackPanel from './panels/FeedbackPanel'
import NotesPanel from './panels/NotesPanel'
import QuestionPanel from './panels/QuestionPanel'

export default function SidePanel({ roomId, token, me, question, onQuestionChange, chat, onSendChat, connected }) {
  const [active, setActive] = useState('question')

  const tabs = [
    { id: 'question', label: 'Question', icon: ClipboardList },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    ...(me.is_host ? [{ id: 'notes', label: 'Notes', icon: FileText }] : []),
    { id: 'feedback', label: 'Feedback', icon: Star },
  ]

  return (
    <aside className="flex h-96 shrink-0 flex-col border-t border-line bg-panel lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
      <nav className="flex border-b border-line" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition ${
              active === id ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        {active === 'question' && (
          <QuestionPanel question={question} isHost={me.is_host} onChange={onQuestionChange} />
        )}
        {active === 'chat' && (
          <ChatPanel messages={chat} meId={me.id} onSend={onSendChat} disabled={!connected} />
        )}
        {active === 'notes' && me.is_host && <NotesPanel roomId={roomId} token={token} />}
        {active === 'feedback' && <FeedbackPanel roomId={roomId} token={token} meId={me.id} />}
      </div>
    </aside>
  )
}
