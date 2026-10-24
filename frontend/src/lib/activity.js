const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

/**
 * Builds the cells of a GitHub-style activity grid for the last `days` days.
 * Cells run column by column (one column per week, Sunday first); `null` pads the first column.
 */
export function buildHeatmap(timestamps, days = 84, today = new Date()) {
  const counts = new Map()
  for (const timestamp of timestamps) {
    const key = dayKey(new Date(timestamp))
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  const cells = Array(start.getDay()).fill(null)
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ date, count: counts.get(dayKey(date)) || 0 })
  }
  return cells
}

/** 0 = no activity ... 3 = very active. */
export const intensity = (count) => (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3)
