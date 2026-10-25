// Draws the shareable Code Story card (1080 x 1350, the portrait size LinkedIn and Instagram like) on a canvas.

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

/** Shrinks the font until the text fits in `maxWidth`. */
function fitText(ctx, text, maxWidth, startSize, weight = 700) {
  let size = startSize
  ctx.font = `${weight} ${size}px ${FONT}`
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 2
    ctx.font = `${weight} ${size}px ${FONT}`
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let offset = 0
  words.forEach((word) => {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset)
      line = word
      offset += lineHeight
    } else {
      line = attempt
    }
  })
  ctx.fillText(line, x, y + offset)
}

export function drawShareCard(canvas, story, name) {
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  const centerX = CARD_WIDTH / 2

  const background = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  background.addColorStop(0, '#4f46e5')
  background.addColorStop(0.55, '#9333ea')
  background.addColorStop(1, '#ec4899')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  ;[
    [930, 140, 280, 0.09],
    [90, 1230, 340, 0.07],
    [980, 1000, 180, 0.06],
  ].forEach(([x, y, radius, alpha]) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fill()
  })

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.font = `800 46px ${FONT}`
  ctx.fillText('CodeRoom', 80, 120)
  ctx.textAlign = 'right'
  ctx.font = `600 30px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText('CODE STORY', CARD_WIDTH - 80, 120)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  fitText(ctx, name, CARD_WIDTH - 160, 84, 800)
  ctx.fillText(name, centerX, 290)

  ctx.font = `200px ${FONT}`
  ctx.fillText(story.personality.emoji, centerX, 560)
  fitText(ctx, story.personality.title, CARD_WIDTH - 160, 88, 800)
  ctx.fillText(story.personality.title, centerX, 690)
  ctx.font = `500 34px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  wrapText(ctx, story.personality.tagline, centerX, 750, CARD_WIDTH - 220, 46)

  const stats = [
    [`${story.solvedCount}/${story.totalProblems}`, 'Solved'],
    [String(story.attempts), 'Test runs'],
    [String(story.longestStreak), 'Best streak'],
  ]
  const boxWidth = 290
  const gap = 30
  const startX = (CARD_WIDTH - (boxWidth * 3 + gap * 2)) / 2
  stats.forEach(([value, label], index) => {
    const x = startX + index * (boxWidth + gap)
    roundedRect(ctx, x, 900, boxWidth, 200, 32)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    fitText(ctx, value, boxWidth - 40, 76, 800)
    ctx.fillText(value, x + boxWidth / 2, 1000)
    ctx.font = `500 30px ${FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(label, x + boxWidth / 2, 1056)
  })

  ctx.fillStyle = '#ffffff'
  fitText(ctx, `Level: ${story.level.name} ${story.level.emoji}`, CARD_WIDTH - 160, 56, 700)
  ctx.fillText(`Level: ${story.level.name} ${story.level.emoji}`, centerX, 1200)
  if (story.topTopic) {
    ctx.font = `500 32px ${FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(`Favourite topic: ${story.topTopic}`, centerX, 1255)
  }
  ctx.font = `500 28px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('#coding  #CodeRoom', centerX, 1305)
}
