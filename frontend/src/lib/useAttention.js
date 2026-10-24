import { useEffect, useRef, useState } from 'react'
import { AttentionTracker, classifyFrame, combineSignals } from './attention'
import { createFaceTracker } from './faceTracker'

const TICK_MS = 200
const IDLE_AFTER_MS = 120_000
const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'pointermove', 'wheel']

/**
 * Watches the local camera and the page to work out whether the user is paying attention,
 * then shares only that status label with the room.
 * Returns { status, engine } where engine is 'loading' | 'face' | 'basic' (tab and activity signals only).
 */
export default function useAttention({ enabled, videoRef, connected, send }) {
  const [status, setStatus] = useState(null)
  const [engine, setEngine] = useState('loading')
  const lastSent = useRef(undefined)

  // Analyse while the camera is on and the user agreed to share attention.
  useEffect(() => {
    if (!enabled) {
      setStatus(null)
      return undefined
    }

    let cancelled = false
    let face = null
    let lastActivity = performance.now()
    const tracker = new AttentionTracker()

    setEngine('loading')
    createFaceTracker()
      .then((instance) => {
        if (cancelled) return instance.close()
        face = instance
        return setEngine('face')
      })
      .catch((error) => {
        console.warn('Face tracking unavailable, using tab and activity signals only.', error)
        if (!cancelled) setEngine('basic')
      })

    const markActive = () => {
      lastActivity = performance.now()
    }
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }))

    const timer = setInterval(() => {
      const now = performance.now()
      const video = videoRef.current
      let frame = null
      if (face && video && video.readyState >= 2) {
        try {
          frame = classifyFrame(face.detect(video, now))
        } catch (error) {
          console.warn('Face tracking failed for one frame', error)
        }
      }
      const raw = combineSignals({
        frame,
        hidden: document.visibilityState === 'hidden' || !document.hasFocus(),
        idle: now - lastActivity > IDLE_AFTER_MS,
      })
      setStatus(tracker.update(raw, now))
    }, TICK_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive))
      face?.close()
    }
  }, [enabled, videoRef])

  // Share the status only when it changes (and again after a reconnect).
  useEffect(() => {
    const value = enabled ? status : null
    if (!connected) {
      lastSent.current = undefined
      return
    }
    if (lastSent.current === value) return
    lastSent.current = value
    send({ type: 'attention', status: value })
  }, [enabled, status, connected, send])

  return { status: enabled ? status : null, engine }
}
