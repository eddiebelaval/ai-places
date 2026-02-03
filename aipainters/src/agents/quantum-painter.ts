import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { complementaryColor } from '../utils/color-harmony.js';
import { isWithinCanvas } from './helpers.js';

export class QuantumPainter extends BaseAgent {
  private queue: PixelPlan[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createField(context);
    }

    while (this.queue.length) {
      const plan = this.queue.shift();
      if (!plan) break;
      if (!isWithinCanvas(plan.x, plan.y)) continue;
      return plan;
    }

    return null;
  }

  private createField(context: AgentContext) {
    const zoneId = this.pickZoneId(
      context,
      context.canvasState.getHotspots().map((zone) => zone.zoneId),
      context.canvasState.getColdspots().map((zone) => zone.zoneId)
    );
    const center = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!center) return [];

    const baseColor = this.pickColor(context.rng);
    const accentColor = complementaryColor(baseColor);
    const size = 8 + Math.floor(context.rng() * 16);
    const density = 30 + Math.floor(context.rng() * 30);

    const plans: PixelPlan[] = [];
    for (let i = 0; i < density; i += 1) {
      const x = center.x + Math.floor((context.rng() - 0.5) * size * 2);
      const y = center.y + Math.floor((context.rng() - 0.5) * size * 2);
      const color = context.rng() < 0.7 ? baseColor : accentColor;
      plans.push({ x, y, color });
    }

    return plans;
  }
}
