import { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import VideoTile from './VideoTile'

/**
 * Strip of participant tiles. Keep it near your webcam (top of the screen) and look at the faces:
 * that is as close to real eye contact as a browser can get.
 */
export default function VideoDock({
  users,
  me,
  localStream,
  remoteStreams,
  localVideoRef,
  localStatus,
  engine,
  shareAttention,
  onShareAttentionChange,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const anyCamera = Boolean(localStream) || users.some((u) => u.camera)
  if (!anyCamera) return null

  return (
    <section className="border-b border-line bg-panel" aria-label="Video">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs text-muted">
        <span className="font-medium text-ink">Video</span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Peer-to-peer, never recorded
        </span>
        {localStream && (
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={shareAttention}
              onChange={(e) => onShareAttentionChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand"
            />
            Share my attention status
            {shareAttention && engine === 'loading' && <span>(loading face tracking...)</span>}
            {shareAttention && engine === 'basic' && <span>(tab and activity only)</span>}
          </label>
        )}
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="ml-auto inline-flex items-center gap-1 hover:text-ink"
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {/* Never unmounted: when collapsed the tiles are only visually hidden, because face tracking reads the local video. */}
      <div className={collapsed ? 'sr-only' : 'flex gap-3 overflow-x-auto px-4 pb-3'}>
          {users.map((user) => {
            const isYou = user.id === me.id
            return (
              <VideoTile
                key={user.id}
                name={user.username}
                isYou={isYou}
                stream={isYou ? localStream : remoteStreams[user.id]}
                videoRef={isYou ? localVideoRef : undefined}
                status={isYou ? localStatus : user.attention}
              />
            )
          })}
      </div>
    </section>
  )
}
