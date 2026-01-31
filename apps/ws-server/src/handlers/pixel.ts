/**
 * Pixel placement handler
 */

import type { WebSocket } from 'ws';
import { config } from '../config/index.js';
import {
  CanvasService,
  CooldownService,
  LeaderboardService
} from '../services/redis.js';
import { send, type UserSession, type ConnectionContext } from './connection.js';
import { REDIS_KEYS, CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_COUNT } from '@aiplaces/shared';
import type {
  PlacePixelMessage,
  PixelErrorMessage,
  CooldownUpdateMessage,
  PixelPlacedMessage,
} from '@aiplaces/shared';

/**
 * Handle pixel placement request
 */
export async function handlePlacePixel(
  ws: WebSocket,
  message: PlacePixelMessage,
  user: UserSession,
  ctx: ConnectionContext
): Promise<void> {
  const { x, y, color } = message.payload;

  // 1. Check if user can place pixels (not spectator, not banned)
  if (user.isSpectatorOnly) {
    send(ws, {
      type: 'pixel_error',
      payload: {
        code: 'SPECTATOR',
        message: 'Your account is too new. Spectator mode only.',
      },
    } as PixelErrorMessage);
    return;
  }

  // 2. Validate coordinates
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= CANVAS_WIDTH ||
    y < 0 ||
    y >= CANVAS_HEIGHT
  ) {
    send(ws, {
      type: 'pixel_error',
      payload: {
        code: 'INVALID_COORDINATES',
        message: `Invalid coordinates: (${x}, ${y})`,
      },
    } as PixelErrorMessage);
    return;
  }

  // 3. Validate color
  if (!Number.isInteger(color) || color < 0 || color >= COLOR_COUNT) {
    send(ws, {
      type: 'pixel_error',
      payload: {
        code: 'INVALID_COLOR',
        message: `Invalid color: ${color}`,
      },
    } as PixelErrorMessage);
    return;
  }

  // 4. Check cooldown
  const cooldownService = new CooldownService(ctx.redis);
  const cooldownCheck = await cooldownService.canPlace(user.userId);

  if (!cooldownCheck.allowed) {
    send(ws, {
      type: 'pixel_error',
      payload: {
        code: 'COOLDOWN',
        message: 'Cooldown active',
        remainingMs: cooldownCheck.remainingMs,
      },
    } as PixelErrorMessage);
    return;
  }

  // 5. Place the pixel
  const canvasService = new CanvasService(ctx.redis);
  await canvasService.setPixel(x, y, color);

  // 6. Set cooldown
  const cooldownMs = user.isVerified
    ? config.cooldown.verifiedMs
    : config.cooldown.normalMs;
  await cooldownService.setCooldown(user.userId, cooldownMs);

  // 7. Update leaderboards
  const leaderboardService = new LeaderboardService(ctx.redis);
  await leaderboardService.incrementUserPixels(user.userId);

  if (user.factionId) {
    await leaderboardService.incrementFactionTerritory(user.factionId);
  }

  // 8. Build pixel update message
  const pixelUpdate: PixelPlacedMessage = {
    type: 'pixel_placed',
    payload: {
      x,
      y,
      color: color as any, // ColorIndex type
      userId: user.userId,
      username: user.xUsername,
      factionId: user.factionId,
      timestamp: Date.now(),
    },
  };

  // 9. Publish to Redis for all server instances
  await ctx.publisher.publish(
    REDIS_KEYS.PUBSUB_PIXELS,
    JSON.stringify(pixelUpdate)
  );

  // 10. Send cooldown update to placing user
  send(ws, {
    type: 'cooldown_update',
    payload: {
      remainingMs: cooldownMs,
      cooldownSeconds: user.cooldownSeconds,
    },
  } as CooldownUpdateMessage);

  console.log(
    `Pixel placed by ${user.xUsername} at (${x}, ${y}) color ${color}`
  );
}
