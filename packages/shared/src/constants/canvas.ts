/**
 * Canvas configuration constants
 */

/** Canvas dimensions */
export const CANVAS_WIDTH = 500;
export const CANVAS_HEIGHT = 500;
export const CANVAS_SIZE = CANVAS_WIDTH; // Alias for square canvas
export const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

/** Bits per pixel (4 bits = 16 colors) */
export const BITS_PER_PIXEL = 4;

/** Canvas data size in bytes (500 * 500 * 4 bits / 8 = 125,000 bytes) */
export const CANVAS_DATA_SIZE = (TOTAL_PIXELS * BITS_PER_PIXEL) / 8;

/** Number of colors in palette */
export const COLOR_COUNT = 16;

/** Cooldown times in milliseconds */
export const COOLDOWNS = {
  /** Verified X users (blue checkmark) */
  VERIFIED_MS: 5000,
  /** Normal users */
  NORMAL_MS: 10000,
  /** Production values (for later) */
  PRODUCTION: {
    VERIFIED_MS: 3 * 60 * 1000, // 3 minutes
    NORMAL_MS: 5 * 60 * 1000,   // 5 minutes
  },
} as const;

/** Sybil defense: minimum account age in days */
export const MIN_ACCOUNT_AGE_DAYS = 30;

/** Zoom levels for viewport */
export const ZOOM = {
  MIN: 1,
  MAX: 40,
  DEFAULT: 10,  // 10x zoom = 10×10 screen pixels per canvas pixel (r/place style)
  DRAW: 20,
} as const;

/** WebSocket configuration */
export const WS_CONFIG = {
  /** Authentication timeout in ms */
  AUTH_TIMEOUT_MS: 10000,
  /** Heartbeat interval in ms */
  HEARTBEAT_INTERVAL_MS: 30000,
  /** Reconnect delays in ms */
  RECONNECT_DELAYS: [1000, 2000, 4000, 8000, 16000],
} as const;

/** Redis key prefixes */
export const REDIS_KEYS = {
  CANVAS_STATE: 'xplace:canvas:state',
  COOLDOWN: (userId: string) => `xplace:cooldown:${userId}`,
  SESSION: (token: string) => `xplace:session:${token}`,
  LEADERBOARD_FACTIONS: 'xplace:leaderboard:factions',
  LEADERBOARD_USERS: 'xplace:leaderboard:users',
  OWNERSHIP: (chunkId: string) => `xplace:ownership:${chunkId}`,
  ACTIVE_DAILY: (date: string) => `xplace:active:daily:${date}`,
  PUBSUB_PIXELS: 'xplace:pubsub:pixels',
  // V2: Weekly reset system
  WEEK_CONFIG: 'xplace:week:config',
  CANVAS_BACKUP: 'xplace:canvas:backup',
  WEEKLY_PIXELS_USER: (userId: string) => `xplace:weekly:pixels:user:${userId}`,
  WEEKLY_PIXELS_AGENT: (agentId: string) => `xplace:weekly:pixels:agent:${agentId}`,
  WEEKLY_CONTRIBUTORS: 'xplace:weekly:contributors',
  PUBSUB_WEEK: 'xplace:pubsub:week',
} as const;
