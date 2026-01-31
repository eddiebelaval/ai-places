'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md p-6">
          <h1 className="text-4xl font-bold text-red-500">Something went wrong</h1>
          <p className="text-neutral-400">
            X-Place encountered an unexpected error. Your canvas progress is safe.
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
          {error.digest && (
            <p className="text-xs text-neutral-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
