/**
 * WebSocket message types for X-Place
 */

import type { ColorIndex, PixelPlacement } from './canvas.js';
import type { UserSession, LeaderboardEntry } from './user.js';
import type { WeekConfig, WeekStats } from './week.js';

// ============================================
// CLIENT -> SERVER MESSAGES
// ============================================

export interface AuthenticateMessage {
  type: 'authenticate';
  payload: {
    token: string;
  };
}

export interface PlacePixelMessage {
  type: 'place_pixel';
  payload: {
    x: number;
    y: number;
    color: ColorIndex;
  };
}

export interface GetCanvasMessage {
  type: 'get_canvas';
  payload: {
    format: 'full' | 'delta';
    since?: number;
  };
}

export interface JoinFactionMessage {
  type: 'join_faction';
  payload: {
    factionId: string;
  };
}

export interface PingMessage {
  type: 'ping';
}

export type ClientMessage =
  | AuthenticateMessage
  | PlacePixelMessage
  | GetCanvasMessage
  | JoinFactionMessage
  | PingMessage;

// ============================================
// SERVER -> CLIENT MESSAGES
// ============================================

export interface AuthenticatedMessage {
  type: 'authenticated';
  payload: {
    userId: string;
    username: string;
    factionId: string | null;
    cooldownSeconds: number;
    isSpectatorOnly: boolean;
  };
}

export interface AuthErrorMessage {
  type: 'auth_error';
  payload: {
    message: string;
  };
}

export interface PixelPlacedMessage {
  type: 'pixel_placed';
  payload: PixelPlacement;
}

export type PixelErrorCode =
  | 'COOLDOWN'
  | 'SPECTATOR'
  | 'BANNED'
  | 'INVALID_COORDINATES'
  | 'INVALID_COLOR'
  | 'RATE_LIMITED'
  | 'NOT_AUTHENTICATED';

export interface PixelErrorMessage {
  type: 'pixel_error';
  payload: {
    code: PixelErrorCode;
    message: string;
    remainingMs?: number;
  };
}

export interface CanvasStateMessage {
  type: 'canvas_state';
  payload: {
    format: 'full' | 'delta';
    data: string;
    version: number;
    timestamp: number;
  };
}

export interface CooldownUpdateMessage {
  type: 'cooldown_update';
  payload: {
    remainingMs: number;
    cooldownSeconds: number;
  };
}

export interface LeaderboardUpdateMessage {
  type: 'leaderboard_update';
  payload: {
    factions: LeaderboardEntry[];
    users: LeaderboardEntry[];
  };
}

export interface PongMessage {
  type: 'pong';
  payload: {
    serverTime: number;
  };
}

export interface ConnectionCountMessage {
  type: 'connection_count';
  payload: {
    count: number;
  };
}

// ============================================
// V2: WEEK SYSTEM MESSAGES
// ============================================

export interface WeekConfigMessage {
  type: 'week_config';
  payload: WeekConfig;
}

export interface WeekResetMessage {
  type: 'week_reset';
  payload: {
    /** Archive ID of the just-completed week */
    archiveId: string;
    /** Stats from the completed week */
    stats: WeekStats;
    /** New week configuration */
    newConfig: WeekConfig;
  };
}

export interface WeekWarningMessage {
  type: 'week_warning';
  payload: {
    /** Minutes until reset */
    minutesRemaining: number;
    /** Human-readable message */
    message: string;
  };
}

export type ServerMessage =
  | AuthenticatedMessage
  | AuthErrorMessage
  | PixelPlacedMessage
  | PixelErrorMessage
  | CanvasStateMessage
  | CooldownUpdateMessage
  | LeaderboardUpdateMessage
  | PongMessage
  | ConnectionCountMessage
  | WeekConfigMessage
  | WeekResetMessage
  | WeekWarningMessage;
