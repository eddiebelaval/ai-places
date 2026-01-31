/**
 * WebSocket connection handler
 */

import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { CanvasService } from '../services/redis.js';
import { handlePlacePixel } from './pixel.js';
import { REDIS_KEYS } from '@aiplaces/shared';
import type {
  ClientMessage,
  AuthenticatedMessage,
  AuthErrorMessage,
  CanvasStateMessage,
  PongMessage,
  ServerMessage,
} from '@aiplaces/shared';

export interface UserSession {
  userId: string;
  xUsername: string;
  factionId: string | null;
  isVerified: boolean;
  isSpectatorOnly: boolean;
  cooldownSeconds: number;
}

export interface ConnectionContext {
  redis: Redis;
  publisher: Redis;
  clients: Map<string, Set<WebSocket>>;
}

/**
 * Send a message to a WebSocket client
 */
export function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Handle a new WebSocket connection
 */
export async function handleConnection(
  ws: WebSocket,
  req: IncomingMessage,
  ctx: ConnectionContext
): Promise<void> {
  let authenticatedUser: UserSession | null = null;
  let authenticatedSession: Record<string, unknown> | null = null;
  let sessionToken: string | null = null;

  console.log('New WebSocket connection established');

  // IMPORTANT: Register message handler FIRST before any async operations
  // This prevents race conditions where client sends messages before handler is ready
  ws.on('message', async (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      // Handle authentication
      if (message.type === 'authenticate') {
        const token = message.payload.token;
        const redisKey = REDIS_KEYS.SESSION(token);
        const session = await ctx.redis.get(redisKey);
  
        if (!session) {
          send(ws, {
            type: 'auth_error',
            payload: { message: 'Invalid or expired session' },
          } as AuthErrorMessage);
          ws.close(4002, 'Invalid session');
          return;
        }

        authenticatedSession = JSON.parse(session) as Record<string, unknown>;
        authenticatedUser = authenticatedSession as UserSession;
        sessionToken = token;

        // Add to clients map
        if (!ctx.clients.has(authenticatedUser.userId)) {
          ctx.clients.set(authenticatedUser.userId, new Set());
        }
        ctx.clients.get(authenticatedUser.userId)!.add(ws);

        // Send authentication success
        send(ws, {
          type: 'authenticated',
          payload: {
            userId: authenticatedUser.userId,
            username: authenticatedUser.xUsername,
            factionId: authenticatedUser.factionId,
            cooldownSeconds: authenticatedUser.cooldownSeconds,
            isSpectatorOnly: authenticatedUser.isSpectatorOnly,
          },
        } as AuthenticatedMessage);

        // Send initial canvas state
        const canvasService = new CanvasService(ctx.redis);
        const canvasData = await canvasService.getFullCanvas();

        send(ws, {
          type: 'canvas_state',
          payload: {
            format: 'full',
            data: canvasData,
            version: 0,
            timestamp: Date.now(),
          },
        } as CanvasStateMessage);

        console.log(`User ${authenticatedUser.xUsername} connected`);
        return;
      }

      // Route messages - some allowed without auth
      switch (message.type) {
        case 'ping':
          send(ws, {
            type: 'pong',
            payload: { serverTime: Date.now() },
          } as PongMessage);
          break;

        case 'get_canvas': {
          const canvasService = new CanvasService(ctx.redis);
          const canvasData = await canvasService.getFullCanvas();
          send(ws, {
            type: 'canvas_state',
            payload: {
              format: 'full',
              data: canvasData,
              version: 0,
              timestamp: Date.now(),
            },
          } as CanvasStateMessage);
          break;
        }

        case 'place_pixel':
          // Require authentication for placing pixels
          if (!authenticatedUser) {
            send(ws, {
              type: 'pixel_error',
              payload: {
                code: 'NOT_AUTHENTICATED',
                message: 'You must be logged in to place pixels',
              },
            });
            return;
          }
          await handlePlacePixel(ws, message, authenticatedUser, ctx);
          break;

        case 'join_faction':
          // Require authentication for joining factions
          if (!authenticatedUser) {
            send(ws, {
              type: 'auth_error',
              payload: { message: 'Not authenticated' },
            } as AuthErrorMessage);
            return;
          }
          if (!message.payload?.factionId || typeof message.payload.factionId !== 'string') {
            send(ws, {
              type: 'auth_error',
              payload: { message: 'Invalid faction' },
            } as AuthErrorMessage);
            return;
          }

          const requestedFaction = message.payload.factionId.trim();
          const isValidFaction = /^#?[a-zA-Z0-9_-]{2,32}$/.test(requestedFaction);
          if (!isValidFaction) {
            send(ws, {
              type: 'auth_error',
              payload: { message: 'Invalid faction format' },
            } as AuthErrorMessage);
            return;
          }

          authenticatedUser.factionId = requestedFaction;
          if (authenticatedSession) {
            authenticatedSession.factionId = requestedFaction;
          }

          if (sessionToken) {
            const redisKey = REDIS_KEYS.SESSION(sessionToken);
            try {
              const ttl = await ctx.redis.ttl(redisKey);
              const ttlSeconds = ttl > 0 ? ttl : 86400;
              await ctx.redis.set(redisKey, JSON.stringify(authenticatedSession ?? authenticatedUser), {
                ex: ttlSeconds,
              });
            } catch (error) {
              console.error('Failed to persist faction selection:', error);
            }
          }

          send(ws, {
            type: 'authenticated',
            payload: {
              userId: authenticatedUser.userId,
              username: authenticatedUser.xUsername,
              factionId: authenticatedUser.factionId,
              cooldownSeconds: authenticatedUser.cooldownSeconds,
              isSpectatorOnly: authenticatedUser.isSpectatorOnly,
            },
          } as AuthenticatedMessage);
          break;

        default:
          console.warn('Unknown message type:', (message as any).type);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');

    if (authenticatedUser) {
      const userSockets = ctx.clients.get(authenticatedUser.userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          ctx.clients.delete(authenticatedUser.userId);
        }
      }
      console.log(`User ${authenticatedUser.xUsername} disconnected`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  // Send initial canvas state (after handlers are registered)
  try {
    const canvasService = new CanvasService(ctx.redis);
    const canvasData = await canvasService.getFullCanvas();
    send(ws, {
      type: 'canvas_state',
      payload: {
        format: 'full',
        data: canvasData,
        version: 0,
        timestamp: Date.now(),
      },
    } as CanvasStateMessage);
    console.log('Sent initial canvas state');
  } catch (err) {
    console.error('Failed to send initial canvas state:', err);
  }
}
