import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring sample rate
  tracesSampleRate: 0.1,

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out noisy errors
  ignoreErrors: [
    // Network errors
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // WebSocket reconnection (expected behavior)
    'WebSocket connection failed',
  ],

  // Environment tag
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
});
