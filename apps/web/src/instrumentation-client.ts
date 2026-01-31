import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production with valid DSN
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Debug in development
  debug: process.env.NODE_ENV === 'development',

  // Filter out common noise
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors users can't control
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // Resize observer spam
    'ResizeObserver loop',
    // WebSocket reconnection (expected behavior)
    'WebSocket connection failed',
  ],
})
