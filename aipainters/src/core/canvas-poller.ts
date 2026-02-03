import WebSocket from 'ws';
import { logger } from '../utils/logger.js';

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const BITS_PER_PIXEL = 4;

export type CanvasSnapshot = {
  pixels: Uint8Array;
  timestamp: number;
};

export type CanvasPollerOptions = {
  wsUrl: string;
  pollIntervalMs?: number;
};

/**
 * Polls canvas state via WebSocket to track external pixel placements
 */
export class CanvasPoller {
  private wsUrl: string;
  private pollIntervalMs: number;
  private ws: WebSocket | null = null;
  private snapshot: CanvasSnapshot | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(options: CanvasPollerOptions) {
    this.wsUrl = options.wsUrl;
    this.pollIntervalMs = options.pollIntervalMs ?? 60000; // Default: poll every 60s
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop() {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSnapshot(): CanvasSnapshot | null {
    return this.snapshot;
  }

  /**
   * Get the color at a specific pixel from the latest snapshot
   */
  getPixelColor(x: number, y: number): number | null {
    if (!this.snapshot) return null;
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return null;

    const pixelIndex = y * CANVAS_WIDTH + x;
    const byteIndex = Math.floor(pixelIndex / 2);
    const isHighNibble = pixelIndex % 2 === 0;

    const byte = this.snapshot.pixels[byteIndex];
    if (byte === undefined) return null;

    return isHighNibble ? (byte >> 4) & 0x0f : byte & 0x0f;
  }

  /**
   * Check if a pixel has a non-white color (likely painted recently by someone)
   */
  isPixelOccupied(x: number, y: number): boolean {
    const color = this.getPixelColor(x, y);
    // Color 0 is white (empty), anything else is occupied
    return color !== null && color !== 0;
  }

  private connect() {
    if (!this.running) return;

    logger.info(`Connecting to canvas WebSocket: ${this.wsUrl}`);

    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      logger.info('Canvas WebSocket connected');
      this.requestCanvas();
      this.startPolling();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'canvas_state' && message.payload?.data) {
          this.handleCanvasState(message.payload.data);
        }
      } catch (err) {
        logger.warn('Failed to parse WebSocket message', err);
      }
    });

    this.ws.on('close', () => {
      logger.warn('Canvas WebSocket closed');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      logger.error('Canvas WebSocket error', err);
    });
  }

  private requestCanvas() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'get_canvas' }));
    }
  }

  private handleCanvasState(base64Data: string) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      this.snapshot = {
        pixels: new Uint8Array(buffer),
        timestamp: Date.now(),
      };
      logger.info(`Canvas snapshot updated (${buffer.length} bytes)`);
    } catch (err) {
      logger.error('Failed to decode canvas state', err);
    }
  }

  private startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.requestCanvas();
    }, this.pollIntervalMs);
  }

  private scheduleReconnect() {
    if (!this.running) return;
    if (this.reconnectTimer) return;

    logger.info('Scheduling WebSocket reconnect in 5s...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}
