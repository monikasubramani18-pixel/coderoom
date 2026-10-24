import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

// Set VITE_ICE_SERVERS to a JSON array to add a TURN server (needed on some strict networks).
function parseIceServers(raw) {
  if (!raw) return DEFAULT_ICE_SERVERS
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_ICE_SERVERS
  } catch {
    return DEFAULT_ICE_SERVERS
  }
}

const ICE_SERVERS = parseIceServers(import.meta.env.VITE_ICE_SERVERS)

function describeCameraError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Camera access was blocked. Allow it in the browser address bar and try again.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is being used by another application.'
    default:
      return 'Could not start the camera.'
  }
}

/**
 * Peer-to-peer video calls between the people in a room (one RTCPeerConnection per pair).
 * The existing room WebSocket only carries the signalling; media never touches the server.
 * Between two people the one with the lower user id sends the offer, so offers never collide.
 */
export default function useVideoCall({ me, users, connected, send, signalHandlerRef }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [micOn, setMicOn] = useState(false)

  const localStreamRef = useRef(null)
  const connections = useRef(new Map()) // user id -> { pc, pending, remoteReady, signature }
  const announced = useRef(false)
  const sendRef = useRef(send)

  useEffect(() => {
    sendRef.current = send
  })

  const closeConnection = useCallback((userId) => {
    const entry = connections.current.get(userId)
    if (!entry) return
    entry.pc.onicecandidate = null
    entry.pc.ontrack = null
    entry.pc.close()
    connections.current.delete(userId)
    setRemoteStreams((current) => {
      if (!(userId in current)) return current
      const next = { ...current }
      delete next[userId]
      return next
    })
  }, [])

  const createConnection = useCallback((userId, signature) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const entry = { pc, pending: [], remoteReady: false, signature }
    connections.current.set(userId, entry)

    const stream = localStreamRef.current
    if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendRef.current({ type: 'rtc', to: userId, data: { kind: 'candidate', candidate: event.candidate.toJSON() } })
      }
    }
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteStream) setRemoteStreams((current) => ({ ...current, [userId]: remoteStream }))
    }
    return entry
  }, [])

  const flushPending = async (entry) => {
    entry.remoteReady = true
    for (const candidate of entry.pending.splice(0)) await entry.pc.addIceCandidate(candidate)
  }

  const startOffer = useCallback(
    async (userId, signature) => {
      const entry = createConnection(userId, signature)
      if (!localStreamRef.current) {
        // Nothing to send, but still ask to receive the other person's video and audio.
        entry.pc.addTransceiver('video', { direction: 'recvonly' })
        entry.pc.addTransceiver('audio', { direction: 'recvonly' })
      }
      const offer = await entry.pc.createOffer()
      await entry.pc.setLocalDescription(offer)
      sendRef.current({ type: 'rtc', to: userId, data: { kind: 'offer', description: entry.pc.localDescription } })
    },
    [createConnection]
  )

  // Signalling messages relayed by the server.
  useEffect(() => {
    signalHandlerRef.current = async ({ from, data }) => {
      try {
        if (data.kind === 'offer') {
          closeConnection(from) // every offer starts a fresh connection
          const entry = createConnection(from, null)
          await entry.pc.setRemoteDescription(data.description)
          await flushPending(entry)
          const answer = await entry.pc.createAnswer()
          await entry.pc.setLocalDescription(answer)
          sendRef.current({ type: 'rtc', to: from, data: { kind: 'answer', description: entry.pc.localDescription } })
        } else if (data.kind === 'answer') {
          const entry = connections.current.get(from)
          if (!entry) return
          await entry.pc.setRemoteDescription(data.description)
          await flushPending(entry)
        } else if (data.kind === 'candidate') {
          const entry = connections.current.get(from)
          if (!entry) return
          if (entry.remoteReady) await entry.pc.addIceCandidate(data.candidate)
          else entry.pending.push(data.candidate)
        }
      } catch (error) {
        console.warn('WebRTC signalling error', error)
      }
    }
    return () => {
      signalHandlerRef.current = null
    }
  }, [signalHandlerRef, closeConnection, createConnection])

  // Keep the connections in line with who is in the room and who has a camera on.
  useEffect(() => {
    if (!me) return
    const present = new Set()
    users.forEach((user) => {
      if (user.id === me.id) return
      present.add(user.id)

      const shouldConnect = Boolean(localStream) || user.camera
      const existing = connections.current.get(user.id)
      if (!shouldConnect) {
        if (existing) closeConnection(user.id)
        return
      }
      if (me.id > user.id) return // the other person sends the offer

      const signature = `${Boolean(localStream)}:${Boolean(user.camera)}`
      if (existing?.signature === signature) return
      closeConnection(user.id)
      startOffer(user.id, signature).catch((error) => console.warn('Could not start a video connection', error))
    })
    for (const id of [...connections.current.keys()]) {
      if (!present.has(id)) closeConnection(id)
    }
  }, [users, localStream, me, closeConnection, startOffer])

  // Tell the room when the camera turns on or off (and again after a reconnect).
  useEffect(() => {
    if (!connected) return
    if (localStream) {
      sendRef.current({ type: 'camera', on: true })
      announced.current = true
    } else if (announced.current) {
      sendRef.current({ type: 'camera', on: false })
      announced.current = false
    }
  }, [connected, localStream])

  const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop())

  /** Resolves to an error message, or null when the camera started. */
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return 'This browser does not support camera access.'
    const video = { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 24 }, facingMode: 'user' }
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch (error) {
        if (error?.name !== 'NotFoundError') throw error
        stream = await navigator.mediaDevices.getUserMedia({ video }) // no microphone: video only
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false // start muted to avoid echo
      })
      localStreamRef.current = stream
      setMicOn(false)
      setLocalStream(stream)
      return null
    } catch (error) {
      return describeCameraError(error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    stopTracks(localStreamRef.current)
    localStreamRef.current = null
    setLocalStream(null)
    setMicOn(false)
  }, [])

  const toggleMic = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? []
    if (tracks.length === 0) return
    const next = !tracks[0].enabled
    tracks.forEach((track) => {
      track.enabled = next
    })
    setMicOn(next)
  }, [])

  // Release the camera and connections when leaving the room.
  useEffect(() => {
    const active = connections.current
    return () => {
      stopTracks(localStreamRef.current)
      for (const id of [...active.keys()]) closeConnection(id)
    }
  }, [closeConnection])

  return { localStream, remoteStreams, micOn, startCamera, stopCamera, toggleMic }
}
