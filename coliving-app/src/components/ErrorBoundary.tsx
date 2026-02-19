import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
            <h1 className="mb-2 text-lg font-semibold text-red-600">Something went wrong</h1>
            <p className="mb-4 text-sm text-slate-600">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Check the browser console for details. If using Supabase, ensure VITE_SUPABASE_URL and
              VITE_SUPABASE_ANON_KEY are set in .env.local. Use the <strong>anon</strong> key (JWT
              starting with eyJ) from Project Settings → API.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
