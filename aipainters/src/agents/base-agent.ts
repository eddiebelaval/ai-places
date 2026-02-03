import type { AgentConfig, AgentContext, PixelPlan } from './types.js';
import { territoryStrategy } from '../core/territory-strategy.js';
import { templateStrategy } from '../core/template-strategy.js';

// Game modes
export type GameMode = 'freeplay' | 'territory-wars' | 'collaborative-art';

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly colors: number[];
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly preferredZones: number[];

  private nextAllowedAt = 0;
  static gameMode: GameMode = 'collaborative-art'; // Current game mode: paint a heart!

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.colors = config.colors;
    this.minDelayMs = config.minDelayMs;
    this.maxDelayMs = config.maxDelayMs;
    this.preferredZones = config.preferredZones || [];
  }

  shouldPaint(now: number) {
    return now >= this.nextAllowedAt;
  }

  getNextAllowedAt() {
    return this.nextAllowedAt;
  }

  setCooldown(now: number, cooldownMs: number) {
    this.nextAllowedAt = Math.max(this.nextAllowedAt, now + cooldownMs);
  }

  getNextDelayMs() {
    const jitter = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1));
    return this.minDelayMs + jitter;
  }

  planNextPixel(context: AgentContext): PixelPlan | null {
    // In Territory Wars mode, use shared territory strategy
    if (BaseAgent.gameMode === 'territory-wars') {
      return this.planTerritoryPixel(context);
    }
    // In Collaborative Art mode, use shared template
    if (BaseAgent.gameMode === 'collaborative-art') {
      return this.planTemplatePixel(context);
    }
    // Otherwise use agent's individual style
    return this.generateNextPixel(context);
  }

  /**
   * Territory Wars: expand shared territory from corner
   */
  private planTerritoryPixel(context: AgentContext): PixelPlan | null {
    const pos = territoryStrategy.getNextPosition(context.rng);
    if (!pos) return null;

    // Use agent's color palette for variety within territory
    const color = this.pickColor(context.rng);

    return { x: pos.x, y: pos.y, color };
  }

  /**
   * Collaborative Art: paint shared template (heart)
   */
  private planTemplatePixel(context: AgentContext): PixelPlan | null {
    const result = templateStrategy.getNextPosition(context.rng);
    if (!result) return null;

    return { x: result.x, y: result.y, color: result.color };
  }

  /**
   * Called after a successful pixel placement to update territory/template
   */
  recordPlacement(x: number, y: number) {
    if (BaseAgent.gameMode === 'territory-wars') {
      territoryStrategy.addPixel(x, y);
    }
    if (BaseAgent.gameMode === 'collaborative-art') {
      templateStrategy.addPixel(x, y);
    }
  }

  protected pickColor(rng: () => number) {
    if (!this.colors.length) return 0;
    return this.colors[Math.floor(rng() * this.colors.length)];
  }

  protected pickZoneId(context: AgentContext, hotspots: number[], coldspots: number[]) {
    if (this.preferredZones.length) {
      return this.preferredZones[Math.floor(context.rng() * this.preferredZones.length)];
    }
    if (coldspots.length && context.rng() < 0.6) {
      return coldspots[Math.floor(context.rng() * coldspots.length)];
    }
    if (hotspots.length) {
      return hotspots[Math.floor(context.rng() * hotspots.length)];
    }
    return context.zoneManager.pickZone();
  }

  protected abstract generateNextPixel(context: AgentContext): PixelPlan | null;
}
