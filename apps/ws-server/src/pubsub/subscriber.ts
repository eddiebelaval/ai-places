/**
 * Redis Pub/Sub subscriber for broadcasting pixel updates
 */

import type { Redis } from 'ioredis';
import type { WebSocket } from 'ws';
import { REDIS_KEYS } from '@aiplaces/shared';

/**
 * Set up Redis subscriber for pixel updates
 * This enables horizontal scaling - all server instances receive updates
 */
export function setupSubscriber(
  subscriber: Redis,
  clients: Map<string, Set<WebSocket>>
): void {
  // Subscribe to pixel updates channel
  subscriber.subscribe(REDIS_KEYS.PUBSUB_PIXELS).then(
    () => {
      console.log(`Subscribed to ${REDIS_KEYS.PUBSUB_PIXELS}`);
    },
    (err) => {
      console.error('Failed to subscribe to Redis channel:', err);
      process.exit(1);
    }
  );

  // Handle incoming messages
  subscriber.on('message', (channel: string, message: string) => {
    if (channel === REDIS_KEYS.PUBSUB_PIXELS) {
      console.log(`Received pub/sub message on ${channel}:`, message.substring(0, 80) + '...');
      broadcastToAll(clients, message);
    }
  });
}

/**
 * Broadcast a message to all connected clients
 */
function broadcastToAll(
  clients: Map<string, Set<WebSocket>>,
  message: string
): void {
  let sentCount = 0;
  let totalClients = 0;

  clients.forEach((sockets) => {
    sockets.forEach((ws) => {
      totalClients++;
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
  });

  // Always log for debugging
  console.log(`Broadcasted to ${sentCount}/${totalClients} clients`);
}
