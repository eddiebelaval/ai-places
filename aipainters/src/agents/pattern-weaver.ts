import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { gridPoints, linePoints } from '../patterns/geometry.js';
import { isWithinCanvas } from './helpers.js';

export class PatternWeaver extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createMotif(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createMotif(context: AgentContext) {
    const zoneId = this.pickZoneId(
      context,
      context.canvasState.getHotspots().map((zone) => zone.zoneId),
      context.canvasState.getColdspots().map((zone) => zone.zoneId)
    );
    const origin = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!origin) return [];

    if (context.rng() < 0.5) {
      return gridPoints(origin.x - 6, origin.y - 6, 12, 12, 2);
    }

    const end = context.zoneManager.pickPointInZone(zoneId) ?? origin;
    const first = linePoints(origin.x, origin.y, end.x, origin.y);
    const second = linePoints(origin.x, origin.y, origin.x, end.y);
    return [...first, ...second];
  }
}
