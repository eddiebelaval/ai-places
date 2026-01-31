'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry and log locally
    Sentry.captureException(error)
    console.error('X-Place Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md p-6" role="alert">
        <h1 className="text-3xl font-bold text-amber-500">Canvas Error</h1>
        <p className="text-neutral-400">
          Something went wrong loading the canvas. Don&apos;t worry - your pixels are safe!
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-sky-600 hover:bg-sky-700 px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-neutral-800 hover:bg-neutral-700 px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Refresh page
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Error ID: {error.digest || 'unknown'}
        </p>
      </div>
    </div>
  )
}
