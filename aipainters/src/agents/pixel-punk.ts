import { BaseAgent } from './base-agent.js';
import type { AgentContext, PixelPlan } from './types.js';
import { spriteNames, spritePoints } from '../patterns/sprites.js';
import { isWithinCanvas } from './helpers.js';

export class PixelPunk extends BaseAgent {
  private queue: { x: number; y: number }[] = [];

  protected generateNextPixel(context: AgentContext): PixelPlan | null {
    if (this.queue.length === 0) {
      this.queue = this.createSprite(context);
    }

    while (this.queue.length) {
      const point = this.queue.shift();
      if (!point) break;
      if (!isWithinCanvas(point.x, point.y)) continue;
      return { x: point.x, y: point.y, color: this.pickColor(context.rng) };
    }

    return null;
  }

  private createSprite(context: AgentContext) {
    const zoneId = this.pickZoneId(
      context,
      context.canvasState.getHotspots().map((zone) => zone.zoneId),
      context.canvasState.getColdspots().map((zone) => zone.zoneId)
    );
    const origin = context.zoneManager.pickPointInZone(zoneId) ?? context.zoneManager.pickRandomPoint();
    if (!origin) return [];

    const nameOptions = spriteNames();
    const spriteName = nameOptions[Math.floor(context.rng() * nameOptions.length)];
    const offsetX = origin.x - 2;
    const offsetY = origin.y - 2;
    return spritePoints(spriteName, offsetX, offsetY);
  }
}
