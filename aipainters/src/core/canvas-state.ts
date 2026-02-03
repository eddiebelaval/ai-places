import type { PixelPlacement } from './api-client.js';
import type { ZoneManager } from '../utils/zone-manager.js';
import type { CanvasPoller } from './canvas-poller.js';

export type PixelInfo = {
  color: number;
  timestamp: number;
  agentId: string;
};

export type ZoneActivity = {
  zoneId: number;
  count: number;
};

export class CanvasState {
  private pixels = new Map<string, PixelInfo>();
  private conflictWindowMs: number;
  private zoneManager: ZoneManager;
  private poller: CanvasPoller | null = null;

  constructor(conflictWindowMs: number, zoneManager: ZoneManager) {
    this.conflictWindowMs = conflictWindowMs;
    this.zoneManager = zoneManager;
  }

  setPoller(poller: CanvasPoller) {
    this.poller = poller;
  }

  recordPlacement(pixel: PixelPlacement, agentId: string, timestamp = Date.now()) {
    const key = keyFor(pixel.x, pixel.y);
    this.pixels.set(key, { color: pixel.color, timestamp, agentId });
    this.pruneOld(timestamp);
  }

  canPlace(x: number, y: number, timestamp = Date.now()): boolean {
    // First check our internal tracking (recent placements by our agents)
    const key = keyFor(x, y);
    const info = this.pixels.get(key);
    if (info && timestamp - info.timestamp < this.conflictWindowMs) {
      return false;
    }

    // Then check the live canvas state from the poller
    // If a pixel is occupied (non-white), be more conservative about overwriting
    if (this.poller) {
      const isOccupied = this.poller.isPixelOccupied(x, y);
      if (isOccupied) {
        // Only overwrite occupied pixels if we haven't touched them recently
        // This allows natural evolution while respecting existing work
        return !info; // Allow if we have no record of placing here
      }
    }

    return true;
  }

  /**
   * Get the actual color at a position from the live canvas
   */
  getLiveColor(x: number, y: number): number | null {
    return this.poller?.getPixelColor(x, y) ?? null;
  }

  /**
   * Check if a pixel is occupied on the live canvas
   */
  isOccupied(x: number, y: number): boolean {
    return this.poller?.isPixelOccupied(x, y) ?? false;
  }

  getRecentPixel(x: number, y: number) {
    return this.pixels.get(keyFor(x, y)) || null;
  }

  getHotspots(limit = 3, activityWindowMs = 15 * 60 * 1000): ZoneActivity[] {
    const stats = this.zoneActivity(activityWindowMs);
    return stats.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  getColdspots(limit = 3, activityWindowMs = 15 * 60 * 1000): ZoneActivity[] {
    const stats = this.zoneActivity(activityWindowMs);
    return stats.sort((a, b) => a.count - b.count).slice(0, limit);
  }

  private zoneActivity(activityWindowMs: number) {
    const now = Date.now();
    const counts = new Map<number, number>();

    for (const [key, info] of this.pixels.entries()) {
      if (now - info.timestamp > activityWindowMs) continue;
      const [x, y] = key.split(',').map((value) => Number(value));
      const zone = this.zoneManager.getZoneForPoint(x, y);
      if (!zone) continue;
      counts.set(zone.id, (counts.get(zone.id) || 0) + 1);
    }

    return this.zoneManager.zones.map((zone) => ({
      zoneId: zone.id,
      count: counts.get(zone.id) || 0,
    }));
  }

  private pruneOld(now: number) {
    const cutoff = now - this.conflictWindowMs * 4;
    for (const [key, info] of this.pixels.entries()) {
      if (info.timestamp < cutoff) {
        this.pixels.delete(key);
      }
    }
  }
}

function keyFor(x: number, y: number) {
  return `${x},${y}`;
}
