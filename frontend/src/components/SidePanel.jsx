import { useEffect, useState } from 'react'
import { ClipboardList, FileText, MessageSquare, Star } from 'lucide-react'
import ChatPanel from './panels/ChatPanel'
import FeedbackPanel from './panels/FeedbackPanel'
import NotesPanel from './panels/NotesPanel'
import QuestionPanel from './panels/QuestionPanel'

export default function SidePanel({
  roomId,
  token,
  me,
  question,
  onQuestionChange,
  problem,
  onOpenPicker,
  onClearProblem,
  chat,
  onSendChat,
  connected,
}) {
  const [active, setActive] = useState('question')
  const [lastSeenId, setLastSeenId] = useState(null)

  // Everything in the chat counts as read while the chat tab is open.
  useEffect(() => {
    if (active === 'chat' && chat.length > 0) setLastSeenId(chat[chat.length - 1].id)
  }, [active, chat])

  const seenIndex = chat.findIndex((message) => message.id === lastSeenId)
  const unread = chat.slice(seenIndex + 1).filter((message) => message.user_id !== me.id).length

  const tabs = [
    { id: 'question', label: 'Question', icon: ClipboardList },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: active === 'chat' ? 0 : unread },
    ...(me.is_host ? [{ id: 'notes', label: 'Notes', icon: FileText }] : []),
    { id: 'feedback', label: 'Feedback', icon: Star },
  ]

  return (
    <aside className="flex h-96 shrink-0 flex-col border-t border-line bg-panel lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
      <nav className="flex border-b border-line" role="tablist">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
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
            {badge > 0 && (
              <span
                className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                aria-label={`${badge} unread messages`}
              >
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        {active === 'question' && (
          <QuestionPanel
            question={question}
            isHost={me.is_host}
            onChange={onQuestionChange}
            problem={problem}
            onOpenPicker={onOpenPicker}
            onClearProblem={onClearProblem}
          />
        )}
        {active === 'chat' && <ChatPanel messages={chat} meId={me.id} onSend={onSendChat} disabled={!connected} />}
        {active === 'notes' && me.is_host && <NotesPanel roomId={roomId} token={token} />}
        {active === 'feedback' && <FeedbackPanel roomId={roomId} token={token} meId={me.id} />}
      </div>
    </aside>
  )
}
