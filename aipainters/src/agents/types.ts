import type { CanvasState } from '../core/canvas-state.js';
import type { ZoneManager } from '../utils/zone-manager.js';

export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  colors: number[];
  minDelayMs: number;
  maxDelayMs: number;
  preferredZones?: number[];
};

export type AgentContext = {
  canvasState: CanvasState;
  zoneManager: ZoneManager;
  now: number;
  rng: () => number;
};

export type PixelPlan = {
  x: number;
  y: number;
  color: number;
  note?: string;
};
