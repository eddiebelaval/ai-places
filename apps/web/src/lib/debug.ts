/**
 * Debug logging utility
 * Only logs in development or when DEBUG=true
 */

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';

export const debug = {
  log: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.warn(...args);
    }
  },
  // Errors always log
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

// WebSocket-specific debug logger
export const wsDebug = {
  log: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.log('[WS]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.warn('[WS]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[WS]', ...args);
  },
};
