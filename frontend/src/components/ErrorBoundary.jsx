import { Component } from 'react'
import { primaryButton } from '../lib/ui'

/** Catches render errors so a bug in one screen never leaves a blank page. */
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas px-6 text-center text-ink">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted">
          An unexpected error occurred. Reloading the page usually fixes it.
        </p>
        <button onClick={() => window.location.reload()} className={primaryButton}>
          Reload page
        </button>
      </div>
    )
  }
}
