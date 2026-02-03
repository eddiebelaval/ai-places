import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { isWithinCanvas } from './helpers.js';

export class NaturalCode extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createHelix(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createHelix(context: AgentContext) {
    const zoneId = this.pickZoneId(
      context,
      context.canvasState.getHotspots().map((zone) => zone.zoneId),
      context.canvasState.getColdspots().map((zone) => zone.zoneId)
    );
    const origin = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!origin) return [];

    const length = 20 + Math.floor(context.rng() * 40);
    const amplitude = 4 + Math.floor(context.rng() * 10);
    const frequency = 1 + context.rng() * 2;

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < length; i += 1) {
      const angle = (i / length) * Math.PI * 2 * frequency;
      const x = origin.x + i;
      const y1 = Math.round(origin.y + Math.sin(angle) * amplitude);
      const y2 = Math.round(origin.y + Math.sin(angle + Math.PI) * amplitude);
      points.push({ x, y: y1 }, { x, y: y2 });
    }

    return points;
  }
}
