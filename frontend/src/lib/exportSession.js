import { languageMeta } from './languages'

const slugify = (text) =>
  (text || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'session'

/** Downloads the session (question, code, results, chat) as a Markdown study note. */
export function exportSession({ title, roomId, language, question, code, runResult, testResult, chat, users }) {
  const fence = '````' // four backticks so code that contains ``` cannot break the block
  const parts = [
    `# ${title || 'CodeRoom session'}`,
    '',
    `- Room: ${roomId}`,
    `- Date: ${new Date().toLocaleString()}`,
    `- Participants: ${users.map((u) => u.username).join(', ') || 'n/a'}`,
  ]
  if (question) parts.push('', '## Question', '', question)
  parts.push('', `## Final code (${languageMeta(language).label})`, '', `${fence}${language}`, code.trimEnd(), fence)
  if (testResult) {
    parts.push('', '## Test results', '', `${testResult.passed} of ${testResult.total} test cases passed (run by ${testResult.by}).`)
  }
  if (runResult) parts.push('', '## Last run output', '', fence, runResult.output.trimEnd(), fence)
  if (chat.length) parts.push('', '## Chat', '', ...chat.map((m) => `- **${m.user}**: ${m.text}`))

  const url = URL.createObjectURL(new Blob([parts.join('\n') + '\n'], { type: 'text/markdown' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(title)}-${roomId}.md`
  link.click()
  URL.revokeObjectURL(url)
}
