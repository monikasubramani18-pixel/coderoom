// Attention analysis. Everything here is pure and runs on the user's own device;
// only the resulting status label (never video frames) is shared with the room.

/** Tune these to make the "looking away" detection stricter or more relaxed. */
export const THRESHOLDS = { yawDeg: 28, pitchDeg: 25, gaze: 0.55 }

export const STATUS_META = {
  focused: { label: 'Focused', dot: 'bg-success', ring: 'ring-success/70' },
  away: { label: 'Looking away', dot: 'bg-warning', ring: 'ring-warning' },
  idle: { label: 'Idle', dot: 'bg-warning', ring: 'ring-warning' },
  no_face: { label: 'Not in frame', dot: 'bg-danger', ring: 'ring-danger' },
  tab_hidden: { label: 'Left the tab', dot: 'bg-danger', ring: 'ring-danger' },
}

const toDegrees = (radians) => (radians * 180) / Math.PI

/**
 * Head yaw and pitch (degrees) from a 4x4 facial transformation matrix (column-major).
 * Uses ratios, so uniform scale does not matter, and |R22| so a flipped front axis cannot read as 180 degrees.
 */
export function poseFromMatrix(matrix) {
  const r02 = matrix[8]
  const r12 = matrix[9]
  const r22 = matrix[10]
  return {
    yaw: toDegrees(Math.atan2(r02, Math.abs(r22))),
    pitch: toDegrees(Math.atan2(-r12, Math.hypot(r02, r22))),
  }
}

/** How strongly the eyes point sideways, from 0 (straight ahead) to 1 (fully sideways). */
export function gazeFromBlendshapes(categories) {
  const scores = new Map(categories.map((c) => [c.categoryName, c.score]))
  const get = (name) => scores.get(name) ?? 0
  const horizontal =
    (get('eyeLookOutLeft') + get('eyeLookInRight') - (get('eyeLookInLeft') + get('eyeLookOutRight'))) / 2
  return Math.abs(horizontal)
}

/** One camera frame -> 'focused' | 'away' | 'no_face'. */
export function classifyFrame(frame, thresholds = THRESHOLDS) {
  if (!frame.hasFace) return 'no_face'
  const turned = Math.abs(frame.yaw ?? 0) > thresholds.yawDeg
  const tilted = Math.abs(frame.pitch ?? 0) > thresholds.pitchDeg
  const eyesAside = (frame.gaze ?? 0) > thresholds.gaze
  return turned || tilted || eyesAside ? 'away' : 'focused'
}

/** Merges the camera result with tab visibility and input activity. `frame` is null when face tracking is unavailable. */
export function combineSignals({ frame, hidden, idle }) {
  if (hidden) return 'tab_hidden'
  if (frame) return frame
  return idle ? 'idle' : 'focused'
}

/**
 * Smooths the raw signal so one blink or a quick glance at the keyboard does not flip the status:
 * a new status must hold for a while before it is committed.
 */
export class AttentionTracker {
  constructor({ holdMs = 1500, noFaceHoldMs = 3000, recoverMs = 500 } = {}) {
    this.holdMs = holdMs
    this.noFaceHoldMs = noFaceHoldMs
    this.recoverMs = recoverMs
    this.committed = 'focused'
    this.candidate = 'focused'
    this.candidateSince = 0
  }

  update(raw, now) {
    if (raw !== this.candidate) {
      this.candidate = raw
      this.candidateSince = now
    }
    const required =
      raw === 'focused' ? this.recoverMs : raw === 'tab_hidden' ? 0 : raw === 'no_face' ? this.noFaceHoldMs : this.holdMs
    if (this.candidate !== this.committed && now - this.candidateSince >= required) {
      this.committed = this.candidate
    }
    return this.committed
  }
}
