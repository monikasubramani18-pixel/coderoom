import { useEffect, useRef } from 'react'
import { dangerButton, ghostButton } from '../lib/ui'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus() // safest default for destructive actions
    const onKeyDown = (event) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm rounded-lg border border-line bg-panel p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold text-ink">
          {title}
        </h2>
        <p id="confirm-message" className="mb-6 text-sm text-muted">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel} className={ghostButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={dangerButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
