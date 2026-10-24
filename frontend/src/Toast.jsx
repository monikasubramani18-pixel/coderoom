import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext({ notify: () => {} })

const TONES = {
  info: { icon: Info, color: 'text-brand' },
  success: { icon: CheckCircle2, color: 'text-success' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  danger: { icon: XCircle, color: 'text-danger' },
}
const DURATION_MS = 4000
const MAX_VISIBLE = 4

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), [])

  const notify = useCallback(
    (message, tone = 'info') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, message, tone }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map(({ id, message, tone }) => {
          const { icon: Icon, color } = TONES[tone] || TONES.info
          return (
            <div
              key={id}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink shadow-lg"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <p className="flex-1">{message}</p>
              <button onClick={() => dismiss(id)} className="text-muted hover:text-ink" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
