import { PROBLEMS, computeStreak } from './problems'

// Turns a user's practice history into a "Code Story": stats, a coding personality and a level.
// Everything here is pure, so it is easy to test.

const DIFFICULTY_RANK = { Easy: 1, Medium: 2 }

export const LEVELS = [
  { min: 0, name: 'Rookie', emoji: '🌱' },
  { min: 1, name: 'Explorer', emoji: '🧭' },
  { min: 3, name: 'Builder', emoji: '🛠️' },
  { min: 6, name: 'Hacker', emoji: '💻' },
  { min: 10, name: 'Architect', emoji: '🏛️' },
  { min: 15, name: 'Wizard', emoji: '🧙' },
  { min: 20, name: 'Legend', emoji: '👑' },
]

export const PERSONALITIES = {
  newcomer: { emoji: '🌱', title: 'Just Getting Started', tagline: 'Every expert started with one run. Your story begins now.' },
  nightOwl: { emoji: '🦉', title: 'Night Owl', tagline: 'The world sleeps, your code compiles.' },
  earlyBird: { emoji: '🐦', title: 'Early Bird', tagline: 'You solve problems before breakfast.' },
  weekendWarrior: { emoji: '⚔️', title: 'Weekend Warrior', tagline: 'Weekends are for levelling up.' },
  streaker: { emoji: '🔥', title: 'Steady Streaker', tagline: 'Consistency beats talent. You show up every day.' },
  sprinter: { emoji: '⚡', title: 'Sprinter', tagline: 'Big bursts of focus, huge progress.' },
  explorer: { emoji: '🧭', title: 'Curious Explorer', tagline: 'You try a bit of everything, and it shows.' },
}

export function levelFor(solved) {
  let index = 0
  LEVELS.forEach((level, i) => {
    if (solved >= level.min) index = i
  })
  const current = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  return {
    ...current,
    next,
    progress: next ? (solved - current.min) / (next.min - current.min) : 1,
    toNext: next ? next.min - solved : 0,
  }
}

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Longest run of consecutive calendar days in a list of 'YYYY-MM-DD' keys. */
export function longestStreakOf(keys) {
  const days = [...new Set(keys)].sort().map((key) => new Date(`${key}T00:00:00`))
  let best = days.length ? 1 : 0
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    const gap = Math.round((days[i] - days[i - 1]) / 86_400_000)
    run = gap === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

export function pickPersonality({ total, nightShare, morningShare, weekendShare, activeDays, longestStreak, bestDayCount }) {
  if (total === 0) return PERSONALITIES.newcomer
  if (nightShare >= 0.45) return PERSONALITIES.nightOwl
  if (morningShare >= 0.45) return PERSONALITIES.earlyBird
  if (activeDays >= 2 && weekendShare >= 0.6) return PERSONALITIES.weekendWarrior
  if (longestStreak >= 3) return PERSONALITIES.streaker
  if (bestDayCount >= 8) return PERSONALITIES.sprinter
  return PERSONALITIES.explorer
}

/** progress = GET /progress, rooms = GET /rooms. */
export function computeStory({ progress, rooms = [] }) {
  const timestamps = progress.activity.map((value) => new Date(value))
  const solvedProblems = progress.problems
    .filter((p) => p.solved)
    .map((p) => PROBLEMS.find((problem) => problem.id === p.problem_id))
    .filter(Boolean)
  const attempts = progress.problems.reduce((sum, p) => sum + p.attempts, 0)

  const perDay = new Map()
  const hours = new Array(24).fill(0)
  let weekend = 0
  timestamps.forEach((date) => {
    const key = dayKey(date)
    perDay.set(key, (perDay.get(key) || 0) + 1)
    hours[date.getHours()] += 1
    if (date.getDay() === 0 || date.getDay() === 6) weekend += 1
  })
  const total = timestamps.length
  const share = (from, to) => (total ? hours.slice(from, to).reduce((a, b) => a + b, 0) / total : 0)
  const nightShare = total ? (hours.slice(22).reduce((a, b) => a + b, 0) + hours.slice(0, 5).reduce((a, b) => a + b, 0)) / total : 0

  const [bestDayKey, bestDayCount] = [...perDay.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0] ?? [null, 0]
  const longestStreak = longestStreakOf([...perDay.keys()])

  const topicCounts = new Map()
  solvedProblems.forEach((problem) => topicCounts.set(problem.topic, (topicCounts.get(problem.topic) || 0) + 1))
  const topics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))

  const hardest =
    [...solvedProblems].sort(
      (a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty] || a.title.localeCompare(b.title)
    )[0] ?? null

  return {
    solvedCount: solvedProblems.length,
    totalProblems: PROBLEMS.length,
    attempts,
    activeDays: perDay.size,
    bestDay: bestDayKey ? { date: bestDayKey, count: bestDayCount } : null,
    topics,
    topTopic: topics[0]?.topic ?? null,
    hardest,
    streak: computeStreak(progress.activity),
    longestStreak,
    roomsHosted: rooms.length,
    level: levelFor(solvedProblems.length),
    personality: pickPersonality({
      total,
      nightShare,
      morningShare: share(5, 10),
      weekendShare: total ? weekend / total : 0,
      activeDays: perDay.size,
      longestStreak,
      bestDayCount,
    }),
    hasActivity: attempts > 0,
  }
}

export function buildCaption(story) {
  if (!story.hasActivity) return 'Starting my coding journey on CodeRoom. 🌱 #coding #CodeRoom'
  return (
    `I solved ${story.solvedCount} problem${story.solvedCount === 1 ? '' : 's'} on CodeRoom, ran tests ${story.attempts} times ` +
    `across ${story.activeDays} day${story.activeDays === 1 ? '' : 's'}, and my coding personality is ${story.personality.title} ` +
    `${story.personality.emoji}. Level: ${story.level.name} ${story.level.emoji} #coding #CodeRoom`
  )
}
