import { useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { ghostButton, primaryButton } from '../lib/ui'

export default function CameraConsentDialog({ open, onConfirm, onCancel }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    confirmRef.current?.focus()
    const onKeyDown = (event) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
        className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Camera className="h-5 w-5" />
          </span>
          <h2 id="camera-title" className="text-lg font-semibold text-ink">
            Turn on your camera?
          </h2>
        </div>
        <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Your video goes directly to the other people in this room. It is never recorded or stored on the server.</li>
          <li>
            Attention detection runs on your device. Only a short status such as Focused or Looking away is shared, never
            images.
          </li>
          <li>You can stop sharing your attention status, mute your microphone or turn the camera off at any time.</li>
        </ul>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={ghostButton}>
            Not now
          </button>
          <button ref={confirmRef} onClick={onConfirm} className={primaryButton}>
            Turn on camera
          </button>
        </div>
      </div>
    </div>
  )
}
