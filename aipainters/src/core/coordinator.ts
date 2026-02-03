import { EventEmitter } from 'node:events';
import { ApiClient } from './api-client.js';
import { CanvasState } from './canvas-state.js';
import { CanvasPoller } from './canvas-poller.js';
import { Scheduler } from './scheduler.js';
import { ZoneManager } from '../utils/zone-manager.js';
import { logger } from '../utils/logger.js';
import type { ResolvedAgentConfig } from '../utils/config.js';
import type { BaseAgent } from '../agents/base-agent.js';
import type { AgentContext, PixelPlan } from '../agents/types.js';

const CANVAS_SIZE = 500;

export type CoordinatorOptions = {
  baseUrl: string;
  wsUrl?: string;
  cooldownMs: number;
  conflictWindowMs: number;
  zones: { id: number; name: string; xStart: number; xEnd: number; yStart: number; yEnd: number }[];
  agents: { config: ResolvedAgentConfig; agent: BaseAgent }[];
};

export type CoordinatorEvent =
  | { type: 'pixel_placed'; agentId: string; agentName: string; pixel: { x: number; y: number; color: number } }
  | { type: 'agent_idle'; agentId: string; agentName: string; reason: string }
  | { type: 'agent_error'; agentId: string; agentName: string; error: string }
  | { type: 'agent_tick'; agentId: string; agentName: string };

export class Coordinator {
  private scheduler = new Scheduler();
  private canvasState: CanvasState;
  private canvasPoller: CanvasPoller | null = null;
  private zoneManager: ZoneManager;
  private options: CoordinatorOptions;
  readonly events = new EventEmitter();

  constructor(options: CoordinatorOptions) {
    this.options = options;
    this.zoneManager = new ZoneManager(options.zones);
    this.canvasState = new CanvasState(options.conflictWindowMs, this.zoneManager);

    // Initialize canvas poller if WebSocket URL is provided
    if (options.wsUrl) {
      this.canvasPoller = new CanvasPoller({
        wsUrl: options.wsUrl,
        pollIntervalMs: 60000, // Poll every 60 seconds
      });
      this.canvasState.setPoller(this.canvasPoller);
    }
  }

  start() {
    // Start canvas poller first to get initial state
    if (this.canvasPoller) {
      this.canvasPoller.start();
      logger.info('Canvas poller started');
    }

    const tasks = this.options.agents.map(({ config, agent }) => {
      const client = new ApiClient({ baseUrl: this.options.baseUrl, apiKey: config.apiKey });
      return {
        id: agent.id,
        name: agent.name,
        run: () => this.tickAgent(agent, client),
      };
    });

    this.scheduler.start(tasks);
    logger.info('Coordinator started with %d agents', tasks.length);
  }

  stop() {
    this.scheduler.stopAll();
    if (this.canvasPoller) {
      this.canvasPoller.stop();
    }
  }

  private async tickAgent(agent: BaseAgent, client: ApiClient) {
    const now = Date.now();
    this.emit({ type: 'agent_tick', agentId: agent.id, agentName: agent.name });

    if (!agent.shouldPaint(now)) {
      return Math.max(500, agent.getNextAllowedAt() - now);
    }

    const context: AgentContext = {
      canvasState: this.canvasState,
      zoneManager: this.zoneManager,
      now,
      rng: Math.random,
    };

    const plan = agent.planNextPixel(context);
    if (!plan) {
      this.emit({ type: 'agent_idle', agentId: agent.id, agentName: agent.name, reason: 'No plan' });
      return agent.getNextDelayMs();
    }

    const pixel = clampPixel(plan);
    if (!pixel) {
      this.emit({ type: 'agent_idle', agentId: agent.id, agentName: agent.name, reason: 'Invalid pixel' });
      return agent.getNextDelayMs();
    }

    if (!this.canvasState.canPlace(pixel.x, pixel.y, now)) {
      this.emit({ type: 'agent_idle', agentId: agent.id, agentName: agent.name, reason: 'Conflict' });
      return Math.max(1000, agent.getNextDelayMs() / 2);
    }

    try {
      const response = await client.placePixel(pixel);
      agent.setCooldown(now, Math.max(response.cooldownMs || 0, this.options.cooldownMs));
      this.canvasState.recordPlacement(pixel, agent.id, now);
      agent.recordPlacement(pixel.x, pixel.y); // Update territory tracking
      this.emit({ type: 'pixel_placed', agentId: agent.id, agentName: agent.name, pixel });
      logger.info(
        '%s placed pixel (%d,%d) color %d',
        agent.name,
        pixel.x,
        pixel.y,
        pixel.color
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'agent_error', agentId: agent.id, agentName: agent.name, error: message });
      logger.warn('Agent %s failed to place pixel: %s', agent.name, message);
      agent.setCooldown(now, this.options.cooldownMs);
    }

    return agent.getNextDelayMs();
  }

  private emit(event: CoordinatorEvent) {
    this.events.emit('event', event);
  }
}

function clampPixel(plan: PixelPlan) {
  const x = Math.round(plan.x);
  const y = Math.round(plan.y);
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return null;
  return { x, y, color: plan.color };
}
