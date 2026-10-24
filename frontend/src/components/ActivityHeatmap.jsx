import { useMemo } from 'react'
import { buildHeatmap, intensity } from '../lib/activity'

const LEVEL_CLASSES = ['bg-raised', 'bg-brand/30', 'bg-brand/60', 'bg-brand']

export default function ActivityHeatmap({ timestamps }) {
  const cells = useMemo(() => buildHeatmap(timestamps), [timestamps])
  const total = cells.reduce((sum, cell) => sum + (cell ? cell.count : 0), 0)

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={`${total} test runs in the last 12 weeks`}
        >
          {cells.map((cell, index) =>
            cell ? (
              <span
                key={index}
                title={`${cell.date.toLocaleDateString()}: ${cell.count} test run${cell.count === 1 ? '' : 's'}`}
                className={`h-3.5 w-3.5 rounded-sm ${LEVEL_CLASSES[intensity(cell.count)]}`}
              />
            ) : (
              <span key={index} className="h-3.5 w-3.5" />
            )
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{total} test runs in the last 12 weeks</span>
        <span className="flex items-center gap-1">
          Less
          {LEVEL_CLASSES.map((level) => (
            <span key={level} className={`h-3 w-3 rounded-sm ${level}`} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
