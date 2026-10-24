import { useEffect, useRef } from 'react'
import { MicOff } from 'lucide-react'
import Avatar from './Avatar'
import { STATUS_META } from '../lib/attention'

/** One participant. Shows their video when available, otherwise an avatar. */
export default function VideoTile({ name, stream, isYou = false, muted = false, status, videoRef }) {
  const fallbackRef = useRef(null)
  const ref = videoRef || fallbackRef
  const hasVideo = Boolean(stream) && stream.getVideoTracks().length > 0

  // The <video> element only exists once a video track arrives, so re-attach the stream when that changes.
  useEffect(() => {
    const element = ref.current
    if (element && element.srcObject !== (stream ?? null)) element.srcObject = stream ?? null
  }, [stream, ref, hasVideo])

  const meta = status ? STATUS_META[status] : null

  return (
    <figure
      className={`relative h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-raised ring-2 transition ${
        meta ? meta.ring : 'ring-transparent'
      }`}
    >
      {hasVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted || isYou}
          className={`h-full w-full object-cover ${isYou ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <Avatar name={name} size="h-10 w-10" />
          <span className="text-[11px] text-muted">Camera off</span>
        </div>
      )}

      <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 px-2 py-1 text-[11px] text-white">
        <span className="truncate">{isYou ? `${name} (you)` : name}</span>
        {meta && (
          <span className="flex shrink-0 items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        )}
      </figcaption>
      {isYou && stream && stream.getAudioTracks()[0]?.enabled === false && (
        <MicOff className="absolute right-1.5 top-1.5 h-4 w-4 rounded bg-black/60 p-0.5 text-white" aria-label="Muted" />
      )}
    </figure>
  )
}
