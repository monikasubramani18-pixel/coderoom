import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, Pause, Play, X } from 'lucide-react'
import { drawShareCard } from '../lib/shareCard'
import { buildCaption } from '../lib/story'

const SLIDE_MS = 6500
const GRADIENTS = [
  'linear-gradient(135deg,#4f46e5,#9333ea)',
  'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#10b981,#0d9488)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#0f172a,#312e81)',
]

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useCountUp(target, durationMs = 1200) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])
  return value
}

function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const fit = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    fit()
    const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4']
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.6,
      size: 6 + Math.random() * 7,
      speed: 2 + Math.random() * 3.5,
      drift: (Math.random() - 0.5) * 2,
      spin: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    const started = performance.now()
    let frame
    const tick = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach((piece) => {
        piece.y += piece.speed
        piece.x += piece.drift
        piece.spin += 0.1
        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.spin)
        ctx.fillStyle = piece.color
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6)
        ctx.restore()
      })
      if (now - started < 3500) frame = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    frame = requestAnimationFrame(tick)
    window.addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', fit)
    }
  }, [])
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}

const rise = (delay = 0) => ({ className: 'story-rise', style: { animationDelay: `${delay}ms` } })

function Slide({ children }) {
  return <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center text-white">{children}</div>
}

function IntroSlide({ name }) {
  return (
    <Slide>
      <p {...rise()} className="story-rise text-lg uppercase tracking-[0.3em] text-white/80">
        CodeRoom
      </p>
      <h2 {...rise(150)} className="story-rise text-6xl font-extrabold leading-tight">
        Hey {name}
      </h2>
      <p {...rise(300)} className="story-rise max-w-sm text-2xl text-white/90">
        Here is your Code Story
      </p>
      <p {...rise(900)} className="story-rise text-sm text-white/70">
        Tap to continue
      </p>
    </Slide>
  )
}

function SolvedSlide({ story }) {
  const solved = useCountUp(story.solvedCount)
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const ratio = story.totalProblems ? story.solvedCount / story.totalProblems : 0
  return (
    <Slide>
      <p {...rise()} className="story-rise text-xl text-white/90">
        {story.solvedCount > 0 ? 'You solved' : 'Your story starts here'}
      </p>
      <div className="story-pop relative h-56 w-56" style={{ animationDelay: '200ms' }}>
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="16" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="#ffffff"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-7xl font-extrabold">{solved}</span>
      </div>
      <p {...rise(400)} className="story-rise text-2xl font-semibold">
        problem{story.solvedCount === 1 ? '' : 's'} out of {story.totalProblems}
      </p>
      <p {...rise(600)} className="story-rise max-w-xs text-sm text-white/80">
        {story.hardest ? `Toughest one: ${story.hardest.title} (${story.hardest.difficulty})` : 'Solve your first problem to unlock more of your story.'}
      </p>
    </Slide>
  )
}

function EffortSlide({ story }) {
  const runs = useCountUp(story.attempts)
  return (
    <Slide>
      <p {...rise()} className="story-rise text-xl text-white/90">
        You ran tests
      </p>
      <p className="story-pop text-8xl font-extrabold" style={{ animationDelay: '200ms' }}>
        {runs}
      </p>
      <p {...rise(400)} className="story-rise text-2xl font-semibold">
        time{story.attempts === 1 ? '' : 's'}
      </p>
      <p {...rise(600)} className="story-rise max-w-xs text-lg text-white/90">
        across {story.activeDays} active day{story.activeDays === 1 ? '' : 's'}
        {story.bestDay && ` · your biggest day had ${story.bestDay.count} runs`}
      </p>
      <p {...rise(800)} className="story-rise text-sm text-white/80">
        Every failed run is a lesson. Keep going.
      </p>
    </Slide>
  )
}

function TopicsSlide({ story }) {
  const top = story.topics.slice(0, 4)
  const max = top[0]?.count || 1
  return (
    <Slide>
      <p {...rise()} className="story-rise text-xl text-white/90">
        {story.topTopic ? 'You gravitate towards' : 'Your favourite topic is waiting'}
      </p>
      {story.topTopic && (
        <h2 {...rise(200)} className="story-rise text-5xl font-extrabold">
          {story.topTopic}
        </h2>
      )}
      <div className="w-full max-w-xs space-y-3 pt-2">
        {top.map((item, index) => (
          <div key={item.topic} {...rise(400 + index * 150)} className="story-rise text-left">
            <div className="mb-1 flex justify-between text-sm">
              <span>{item.topic}</span>
              <span>{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-white/25">
              <div className="h-2 rounded-full bg-white" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-sm text-white/80">Solve a few problems and we will find the topic you love.</p>}
      </div>
    </Slide>
  )
}

function PersonalitySlide({ story }) {
  const { emoji, title, tagline } = story.personality
  return (
    <Slide>
      <p {...rise()} className="story-rise text-xl text-white/90">
        Your coding personality
      </p>
      <div className="story-pop text-9xl" style={{ animationDelay: '250ms' }}>
        {emoji}
      </div>
      <h2 {...rise(500)} className="story-rise text-5xl font-extrabold">
        {title}
      </h2>
      <p {...rise(700)} className="story-rise max-w-xs text-lg text-white/90">
        {tagline}
      </p>
      <p {...rise(900)} className="story-rise text-xs text-white/70">
        Based on when and how you practise
      </p>
    </Slide>
  )
}

function LevelSlide({ story }) {
  const { level } = story
  return (
    <Slide>
      <p {...rise()} className="story-rise text-xl text-white/90">
        Your level
      </p>
      <div className="story-pop text-8xl" style={{ animationDelay: '200ms' }}>
        {level.emoji}
      </div>
      <h2 {...rise(400)} className="story-rise text-5xl font-extrabold">
        {level.name}
      </h2>
      <div {...rise(600)} className="story-rise w-full max-w-xs">
        <div className="h-3 rounded-full bg-white/25">
          <div className="h-3 rounded-full bg-white transition-all duration-1000" style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-white/90">
          {level.next ? `${level.toNext} more solve${level.toNext === 1 ? '' : 's'} to reach ${level.next.name} ${level.next.emoji}` : 'Top level reached. Legendary!'}
        </p>
      </div>
      <div {...rise(800)} className="story-rise flex gap-3 text-sm">
        <span className="rounded-full bg-white/20 px-3 py-1">🔥 {story.streak}-day streak</span>
        <span className="rounded-full bg-white/20 px-3 py-1">🏆 best {story.longestStreak}</span>
      </div>
    </Slide>
  )
}

function ShareSlide({ story, name }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    drawShareCard(canvasRef.current, story, name)
  }, [story, name])

  const download = () => {
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `code-story-${name}.png`
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const copyCaption = async () => {
    await navigator.clipboard.writeText(buildCaption(story))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white" onClick={(event) => event.stopPropagation()}>
      <Confetti />
      <p className="story-rise text-xl font-semibold">Share your story</p>
      <canvas ref={canvasRef} className="story-pop max-h-[52vh] w-auto rounded-2xl shadow-2xl" style={{ aspectRatio: '1080 / 1350' }} />
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-white/90">
          <Download className="h-4 w-4" />
          Download card
        </button>
        <button onClick={copyCaption} className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/30">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Caption copied' : 'Copy caption'}
        </button>
      </div>
    </div>
  )
}

/** Full-screen, Instagram-style story of the user's practice. Tap or use the arrow keys to move, Esc to close. */
export default function StoryViewer({ story, name, onClose }) {
  const slides = useMemo(
    () => [
      () => <IntroSlide name={name} />,
      () => <SolvedSlide story={story} />,
      () => <EffortSlide story={story} />,
      () => <TopicsSlide story={story} />,
      () => <PersonalitySlide story={story} />,
      () => <LevelSlide story={story} />,
      () => <ShareSlide story={story} name={name} />,
    ],
    [story, name]
  )
  const last = slides.length - 1
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last])
  const previous = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowRight' || event.key === ' ') next()
      else if (event.key === 'ArrowLeft') previous()
      else if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous, onClose])

  const Current = slides[index]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Your Code Story">
      <div
        className="relative h-full w-full max-w-md overflow-hidden transition-[background] duration-500 sm:h-[min(92vh,800px)] sm:rounded-3xl"
        style={{ background: GRADIENTS[index % GRADIENTS.length] }}
        onClick={(event) => (event.clientX - event.currentTarget.getBoundingClientRect().left < event.currentTarget.offsetWidth / 3 ? previous() : next())}
      >
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1.5" aria-hidden="true">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              {i < index && <div className="h-full w-full bg-white" />}
              {i === index && (
                <div
                  key={`${index}-bar`}
                  className="h-full bg-white"
                  style={{
                    animation: `story-progress ${SLIDE_MS}ms linear forwards`,
                    animationPlayState: paused || index === last ? 'paused' : 'running',
                    width: index === last ? '100%' : undefined,
                  }}
                  onAnimationEnd={next}
                />
              )}
            </div>
          ))}
        </div>

        <div className="absolute right-3 top-7 z-10 flex gap-2" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => setPaused((value) => !value)} className="rounded-full bg-black/25 p-2 text-white hover:bg-black/40" aria-label={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className="rounded-full bg-black/25 p-2 text-white hover:bg-black/40" aria-label="Close story">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Current key={index} />
      </div>
    </div>
  )
}
