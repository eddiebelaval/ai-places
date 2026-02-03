import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';

export class MinimalistZen extends BaseAgent {
  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    const coldspots = context.canvasState.getColdspots().map((zone) => zone.zoneId);
    const zoneId = this.pickZoneId(context, [], coldspots);
    const point = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!point) return null;
    return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
  }
}
