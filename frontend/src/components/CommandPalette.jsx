import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

/** Quick-action launcher (Ctrl/Cmd + K). Commands are `{ id, label, hint?, run }`. */
export default function CommandPalette({ open, commands, onClose }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return commands.filter((command) => command.label.toLowerCase().includes(needle))
  }, [commands, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const runCommand = (command) => {
    onClose()
    command.run()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && results[index]) {
      event.preventDefault()
      runCommand(results[index])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-panel shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            aria-label="Search commands"
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>

        <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
          {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No matching commands.</li>}
          {results.map((command, position) => (
            <li key={command.id} role="option" aria-selected={position === index}>
              <button
                onClick={() => runCommand(command)}
                onMouseEnter={() => setIndex(position)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm text-ink ${
                  position === index ? 'bg-raised' : ''
                }`}
              >
                {command.label}
                {command.hint && <kbd className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-muted">{command.hint}</kbd>}
              </button>
            </li>
          ))}
        </ul>

        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          Up/Down to navigate, Enter to run, Esc to close
        </p>
      </div>
    </div>
  )
}
