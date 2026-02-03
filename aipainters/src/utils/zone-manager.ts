import type { ZoneDefinition } from './config.js';

export type ZonePoint = { x: number; y: number };

export class ZoneManager {
  readonly zones: ZoneDefinition[];

  constructor(zones: ZoneDefinition[]) {
    this.zones = zones;
  }

  getZone(id: number) {
    return this.zones.find((zone) => zone.id === id) || null;
  }

  getZoneForPoint(x: number, y: number) {
    return (
      this.zones.find(
        (zone) =>
          x >= zone.xStart && x <= zone.xEnd && y >= zone.yStart && y <= zone.yEnd
      ) || null
    );
  }

  pickPointInZone(zoneId: number) {
    const zone = this.getZone(zoneId);
    if (!zone) return null;
    const x = randomInt(zone.xStart, zone.xEnd);
    const y = randomInt(zone.yStart, zone.yEnd);
    return { x, y };
  }

  pickRandomPoint() {
    const zone = this.zones[Math.floor(Math.random() * this.zones.length)];
    return this.pickPointInZone(zone.id);
  }

  pickZone(preferred?: number[], fallback?: number[]) {
    if (preferred && preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)];
    }
    if (fallback && fallback.length > 0) {
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return this.zones[Math.floor(Math.random() * this.zones.length)].id;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
