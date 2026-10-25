// Coding Pulse: works out, from how someone types and runs code, whether they are
// in flow, thinking, debugging or stuck. Everything runs on the user's own device and only
// the state label is shared. The class is pure (time is passed in), so it is easy to test.

export const FLOW_META = {
  flow: { label: 'In flow', emoji: '🌊', color: '#22c55e', tip: 'Steady typing with few deletions' },
  thinking: { label: 'Thinking', emoji: '💭', color: '#3b82f6', tip: 'Paused to think or read' },
  debugging: { label: 'Debugging', emoji: '🐞', color: '#f59e0b', tip: 'Fixing after a failed run' },
  stuck: { label: 'Stuck', emoji: '🧱', color: '#ef4444', tip: 'Long silence, rewriting or repeated failures' },
  solved: { label: 'Solved it', emoji: '🎉', color: '#a855f7', tip: 'All tests passed' },
  idle: { label: 'Idle', emoji: '💤', color: '#64748b', tip: 'No activity for a while' },
}

export const THRESHOLDS = {
  thinkAfterMs: 20_000, // no typing for this long = thinking rather than typing
  stuckAfterMs: 150_000, // silence this long mid-task = stuck
  notStartedStuckAfterMs: 300_000, // before the first edit people are usually just reading
  idleAfterMs: 600_000, // away from the keyboard
  flowWindowMs: 60_000,
  flowMinInserted: 40,
  flowMaxDeleteRatio: 0.35,
  thrashWindowMs: 90_000,
  thrashMinChars: 80,
  thrashDeleteRatio: 0.6,
  failuresForStuck: 4,
  failureWindowMs: 300_000,
  debugWindowMs: 90_000,
}

const KEEP_EDITS_MS = 180_000

export class FlowTracker {
  constructor(now = Date.now(), thresholds = THRESHOLDS) {
    this.t = thresholds
    this.edits = []
    this.runs = []
    this.lastActivityAt = now
    this.hasEdited = false
    this.solved = false
  }

  recordEdit({ inserted = 0, deleted = 0 }, now) {
    this.edits.push({ at: now, inserted, deleted })
    this.edits = this.edits.filter((edit) => now - edit.at <= KEEP_EDITS_MS)
    this.lastActivityAt = now
    this.hasEdited = true
    this.solved = false // working again after a solve
  }

  recordRun(ok, now) {
    this.runs.push({ at: now, ok, ratio: ok ? 1 : 0 })
    this.runs = this.runs.filter((run) => now - run.at <= this.t.failureWindowMs)
    this.lastActivityAt = now
  }

  recordTests(passed, total, now) {
    const ratio = total > 0 ? passed / total : 0
    this.runs.push({ at: now, ok: ratio === 1, ratio })
    this.runs = this.runs.filter((run) => now - run.at <= this.t.failureWindowMs)
    this.lastActivityAt = now
    if (total > 0 && passed === total) this.solved = true
  }

  #editTotals(now, windowMs) {
    return this.edits
      .filter((edit) => now - edit.at <= windowMs)
      .reduce((sum, edit) => ({ inserted: sum.inserted + edit.inserted, deleted: sum.deleted + edit.deleted }), {
        inserted: 0,
        deleted: 0,
      })
  }

  state(now) {
    const t = this.t
    if (this.solved) return 'solved'

    const quiet = now - this.lastActivityAt
    if (quiet >= t.idleAfterMs) return 'idle'

    // Repeated failures with no improvement.
    const failures = this.runs.filter((run) => !run.ok && now - run.at <= t.failureWindowMs)
    if (failures.length >= t.failuresForStuck && failures[failures.length - 1].ratio <= failures[0].ratio) return 'stuck'

    // Writing and deleting the same code over and over.
    const thrash = this.#editTotals(now, t.thrashWindowMs)
    const changed = thrash.inserted + thrash.deleted
    if (changed >= t.thrashMinChars && thrash.deleted / changed >= t.thrashDeleteRatio) return 'stuck'

    // A long silence in the middle of the task.
    if (quiet >= (this.hasEdited ? t.stuckAfterMs : t.notStartedStuckAfterMs)) return 'stuck'

    const lastRun = this.runs[this.runs.length - 1]
    if (lastRun && !lastRun.ok && now - lastRun.at <= t.debugWindowMs) return 'debugging'

    if (quiet < t.thinkAfterMs) {
      const recent = this.#editTotals(now, t.flowWindowMs)
      const total = recent.inserted + recent.deleted
      if (recent.inserted >= t.flowMinInserted && recent.deleted / total <= t.flowMaxDeleteRatio) return 'flow'
    }
    return 'thinking'
  }
}
