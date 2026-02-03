import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { sineWavePoints, flowFieldPoints } from '../patterns/waves.js';
import { isWithinCanvas } from './helpers.js';

export class OrganicFlow extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createFlow(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createFlow(context: AgentContext) {
    const hotspots = context.canvasState.getHotspots().map((zone) => zone.zoneId);
    const coldspots = context.canvasState.getColdspots().map((zone) => zone.zoneId);
    const zoneId = this.pickZoneId(context, hotspots, coldspots);
    const origin = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!origin) return [];

    if (context.rng() < 0.5) {
      const length = 20 + Math.floor(context.rng() * 40);
      const amplitude = 4 + Math.floor(context.rng() * 12);
      const frequency = 1 + context.rng() * 2;
      return sineWavePoints(origin.x, origin.y, length, amplitude, frequency);
    }

    return flowFieldPoints(origin.x, origin.y, 40 + Math.floor(context.rng() * 40));
  }
}
