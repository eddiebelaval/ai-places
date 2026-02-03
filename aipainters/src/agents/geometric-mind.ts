import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { circlePoints, spiralPoints, linePoints, gridPoints } from '../patterns/geometry.js';
import { isWithinCanvas } from './helpers.js';

export class GeometricMind extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createPattern(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createPattern(context: AgentContext) {
    const hotspots = context.canvasState.getHotspots().map((zone) => zone.zoneId);
    const coldspots = context.canvasState.getColdspots().map((zone) => zone.zoneId);
    const zoneId = this.pickZoneId(context, hotspots, coldspots);
    const center = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!center) return [];

    const patternType = Math.floor(context.rng() * 4);
    const radius = 6 + Math.floor(context.rng() * 18);

    if (patternType === 0) {
      return circlePoints(center.x, center.y, radius);
    }

    if (patternType === 1) {
      return spiralPoints(center.x, center.y, 2 + context.rng() * 2, 0.4);
    }

    if (patternType === 2) {
      const end = context.zoneManager.pickPointInZone(zoneId) ?? center;
      return linePoints(center.x, center.y, end.x, end.y);
    }

    return gridPoints(center.x - radius, center.y - radius, radius * 2, radius * 2, 3);
  }
}
