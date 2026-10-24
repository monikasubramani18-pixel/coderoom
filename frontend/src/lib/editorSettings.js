import { useEffect, useState } from 'react'

const STORAGE_KEY = 'coderoom-editor-settings'

export const DEFAULT_EDITOR_SETTINGS = { fontSize: 14, tabSize: 4, wordWrap: false, minimap: false }

function load() {
  try {
    return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return DEFAULT_EDITOR_SETTINGS
  }
}

/** Editor preferences, remembered per browser. */
export function useEditorSettings() {
  const [settings, setSettings] = useState(load)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])
  return [settings, setSettings]
}
