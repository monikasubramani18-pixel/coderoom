import { useEffect } from 'react'

/** Sets the browser tab title (e.g. "Mock interview · CodeRoom"). */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · CodeRoom` : 'CodeRoom'
  }, [title])
}
