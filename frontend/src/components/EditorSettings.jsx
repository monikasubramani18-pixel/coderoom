import { useState } from 'react'
import { Settings } from 'lucide-react'
import { DEFAULT_EDITOR_SETTINGS } from '../lib/editorSettings'
import { ghostButton, iconButton } from '../lib/ui'

function Row({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5 text-sm text-ink">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function EditorSettings({ settings, onChange }) {
  const [open, setOpen] = useState(false)
  const update = (patch) => onChange({ ...settings, ...patch })
  const selectClass = 'h-8 rounded-md border border-line bg-raised px-2 text-sm text-ink'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={iconButton}
        aria-label="Editor settings"
        aria-expanded={open}
        title="Editor settings"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} role="presentation" />
          <div className="absolute left-0 top-11 z-40 w-64 rounded-lg border border-line bg-panel p-4 shadow-xl">
            <p className="mb-2 text-sm font-semibold text-ink">Editor settings</p>
            <Row label="Font size">
              <select value={settings.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className={selectClass}>
                {[12, 13, 14, 16, 18, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Tab size">
              <select value={settings.tabSize} onChange={(e) => update({ tabSize: Number(e.target.value) })} className={selectClass}>
                {[2, 4, 8].map((size) => (
                  <option key={size} value={size}>
                    {size} spaces
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Word wrap">
              <input type="checkbox" checked={settings.wordWrap} onChange={(e) => update({ wordWrap: e.target.checked })} className="h-4 w-4 accent-brand" />
            </Row>
            <Row label="Minimap">
              <input type="checkbox" checked={settings.minimap} onChange={(e) => update({ minimap: e.target.checked })} className="h-4 w-4 accent-brand" />
            </Row>
            <button onClick={() => onChange(DEFAULT_EDITOR_SETTINGS)} className={`${ghostButton} mt-3 w-full`}>
              Reset to defaults
            </button>
          </div>
        </>
      )}
    </div>
  )
}
