import { useEffect } from 'react'
import { X } from 'lucide-react'
import ProblemList from './ProblemList'
import { iconButton } from '../lib/ui'

export default function ProblemPicker({ open, onSelect, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="picker-title" className="font-semibold text-ink">
            Choose a problem
          </h2>
          <button onClick={onClose} className={iconButton} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          <ProblemList actionLabel="Use" onSelect={onSelect} />
        </div>
      </div>
    </div>
  )
}
