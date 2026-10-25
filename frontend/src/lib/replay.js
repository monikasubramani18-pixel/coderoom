// Pure helpers for session replay. `events` come from GET /rooms/:id/replay:
// { id, t (ms since the first event), kind, user, data }.

export const MAX_GAP_MS = 4000

/** Adds `at`, a playback clock where long pauses are squeezed to at most `maxGapMs`. */
export function buildTimeline(events, maxGapMs = MAX_GAP_MS) {
  let clock = 0
  let previous = null
  return events.map((event) => {
    if (previous !== null) clock += Math.min(event.t - previous, maxGapMs)
    previous = event.t
    return { ...event, at: clock }
  })
}

export const durationOf = (timeline) => (timeline.length ? timeline[timeline.length - 1].at : 0)

/** The code on screen at playback time `at`: the latest code snapshot at or before it. */
export function stateAt(timeline, at, fallbackLanguage = 'python') {
  let code = ''
  let language = fallbackLanguage
  let eventIndex = -1
  for (let i = 0; i < timeline.length && timeline[i].at <= at; i += 1) {
    eventIndex = i
    if (timeline[i].kind === 'code') {
      code = timeline[i].data.code
      language = timeline[i].data.language
    }
  }
  return { code, language, eventIndex }
}

/** 1-based numbers of the lines in `next` that differ from the same line in `previous`. */
export function changedLines(previous, next) {
  const before = previous.split('\n')
  const lines = next.split('\n')
  const changed = []
  lines.forEach((line, index) => {
    if (line !== before[index]) changed.push(index + 1)
  })
  return changed
}

/** Headline numbers for the insights card. */
export function computeInsights(events) {
  const ofKind = (kind) => events.filter((event) => event.kind === kind)
  const codeEvents = ofKind('code')
  const runs = ofKind('run')
  const testRuns = ofKind('tests')

  let longestPauseMs = 0
  for (let i = 1; i < codeEvents.length; i += 1) {
    longestPauseMs = Math.max(longestPauseMs, codeEvents[i].t - codeEvents[i - 1].t)
  }

  const bestTests = testRuns.reduce(
    (best, run) => (run.data.total > 0 && run.data.passed / run.data.total > best.ratio ? { ratio: run.data.passed / run.data.total, run } : best),
    { ratio: 0, run: null }
  )

  return {
    activeMs: events.length ? events[events.length - 1].t - events[0].t : 0,
    snapshots: codeEvents.length,
    runs: runs.length,
    failedRuns: runs.filter((run) => !run.data.ok).length,
    testRuns: testRuns.length,
    bestTestRatio: bestTests.ratio,
    firstRunAfterMs: runs.length ? runs[0].t - (events[0]?.t ?? 0) : null,
    longestPauseMs,
    participants: [...new Set(events.map((event) => event.user).filter(Boolean))],
  }
}
