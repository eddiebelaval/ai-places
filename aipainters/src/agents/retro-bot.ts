import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { linePoints } from '../patterns/geometry.js';
import { isWithinCanvas } from './helpers.js';

export class RetroBot extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createWireframe(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createWireframe(context: AgentContext) {
    const zoneId = this.pickZoneId(
      context,
      context.canvasState.getHotspots().map((zone) => zone.zoneId),
      context.canvasState.getColdspots().map((zone) => zone.zoneId)
    );
    const origin = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!origin) return [];

    const width = 10 + Math.floor(context.rng() * 24);
    const height = 10 + Math.floor(context.rng() * 24);
    const x1 = origin.x;
    const y1 = origin.y;
    const x2 = origin.x + width;
    const y2 = origin.y + height;

    const top = linePoints(x1, y1, x2, y1);
    const bottom = linePoints(x1, y2, x2, y2);
    const left = linePoints(x1, y1, x1, y2);
    const right = linePoints(x2, y1, x2, y2);

    return [...top, ...bottom, ...left, ...right];
  }
}
