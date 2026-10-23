import { avatarColor, initials } from '../lib/format'

export default function Avatar({ name, size = 'h-7 w-7', ring = false }) {
  return (
    <span
      title={name}
      className={`inline-flex ${size} items-center justify-center rounded-full text-[11px] font-semibold text-white ${
        ring ? 'ring-2 ring-panel' : ''
      }`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  )
}
