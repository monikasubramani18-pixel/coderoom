import { useCallback, useEffect, useRef, useState } from 'react'
import { FlowTracker } from './flow'

const TICK_MS = 3000
const MIN_DWELL_MS = 8000 // a new state must wait this long after the previous one was shared, so labels do not flicker

/**
 * Keeps a FlowTracker for the local user and shares the resulting state label with the room.
 * Returns { state, recordEdit, recordRun, recordTests }.
 */
export default function useFlow({ enabled, connected, send }) {
  const trackerRef = useRef(null)
  const [state, setState] = useState('thinking')
  const live = useRef({ enabled, connected, send })
  const lastSent = useRef({ value: undefined, at: 0 })

  useEffect(() => {
    live.current = { enabled, connected, send }
  })

  useEffect(() => {
    trackerRef.current = new FlowTracker(Date.now())
    const timer = setInterval(() => {
      const now = Date.now()
      const next = trackerRef.current.state(now)
      setState(next)

      const { enabled: isOn, connected: isConnected, send: sendNow } = live.current
      if (!isConnected) {
        lastSent.current = { value: undefined, at: 0 } // share again after a reconnect
        return
      }
      const value = isOn ? next : null
      if (value !== lastSent.current.value && now - lastSent.current.at >= MIN_DWELL_MS) {
        lastSent.current = { value, at: now }
        sendNow({ type: 'flow', state: value })
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const refresh = () => setState(trackerRef.current.state(Date.now()))

  const recordEdit = useCallback((change) => {
    trackerRef.current?.recordEdit(change, Date.now())
    refresh()
  }, [])
  const recordRun = useCallback((ok) => {
    trackerRef.current?.recordRun(ok, Date.now())
    refresh()
  }, [])
  const recordTests = useCallback((passed, total) => {
    trackerRef.current?.recordTests(passed, total, Date.now())
    refresh()
  }, [])

  return { state, recordEdit, recordRun, recordTests }
}
