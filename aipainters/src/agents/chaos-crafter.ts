import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';

export class ChaosCrafter extends BaseAgent {
  private burstRemaining = 0;
  private nextBurstAt = Date.now();
  private lastNow = Date.now();

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    this.lastNow = context.now;
    if (this.burstRemaining === 0 && context.now >= this.nextBurstAt) {
      this.burstRemaining = 10;
      this.nextBurstAt = context.now + 5 * 60 * 1000;
    }

    if (this.burstRemaining === 0) {
      return null;
    }

    this.burstRemaining -= 1;

    const zoneId = context.zoneManager.pickZone();
    const point = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!point) return null;

    return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
  }

  getNextDelayMs() {
    if (this.burstRemaining > 0) {
      return 500 + Math.floor(Math.random() * 600);
    }
    const untilBurst = this.nextBurstAt - this.lastNow;
    if (untilBurst > this.minDelayMs) return untilBurst;
    return this.minDelayMs + Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1));
  }
}
