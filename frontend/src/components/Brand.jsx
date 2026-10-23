import { Code2 } from 'lucide-react'

export default function Brand({ size = 'md' }) {
  const large = size === 'lg'
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-brand text-white ${
          large ? 'h-11 w-11' : 'h-8 w-8'
        }`}
      >
        <Code2 className={large ? 'h-6 w-6' : 'h-4 w-4'} />
      </span>
      <span className={`font-semibold tracking-tight text-ink ${large ? 'text-2xl' : 'text-lg'}`}>
        CodeRoom
      </span>
    </span>
  )
}
