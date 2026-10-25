import { Fragment } from 'react'

// Minimal, safe Markdown for AI answers: paragraphs, bullet lists, **bold**, `code` and fenced code blocks.
// Everything is rendered as React text, never as HTML.

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-raised px-1 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function TextBlock({ text }) {
  const nodes = []
  let bullets = []

  const flushBullets = () => {
    if (bullets.length === 0) return
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc space-y-1 pl-5">
        {bullets.map((item, index) => (
          <li key={index}>
            <Inline text={item} />
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  text.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)
    if (bullet) {
      bullets.push(bullet[1])
      return
    }
    flushBullets()
    if (line.trim()) {
      nodes.push(
        <p key={`p-${nodes.length}`}>
          <Inline text={line.replace(/^#{1,6}\s+/, '')} />
        </p>
      )
    }
  })
  flushBullets()
  return nodes
}

export default function RichText({ text }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink">
      {text.split('```').map((block, index) =>
        index % 2 === 1 ? (
          <pre key={index} className="overflow-x-auto rounded-md bg-raised p-3 font-mono text-xs">
            <code>{block.replace(/^[\w+-]*\n/, '')}</code>
          </pre>
        ) : (
          <TextBlock key={index} text={block} />
        )
      )}
    </div>
  )
}
