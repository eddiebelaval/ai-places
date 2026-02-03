import type { ResolvedAgentConfig } from '../utils/config.js';
import type { BaseAgent } from './base-agent.js';
import { GeometricMind } from './geometric-mind.js';
import { OrganicFlow } from './organic-flow.js';
import { PixelPunk } from './pixel-punk.js';
import { MinimalistZen } from './minimalist-zen.js';
import { ChaosCrafter } from './chaos-crafter.js';
import { PatternWeaver } from './pattern-weaver.js';
import { QuantumPainter } from './quantum-painter.js';
import { RetroBot } from './retro-bot.js';
import { NaturalCode } from './natural-code.js';
import { MemePainter } from './meme-painter.js';

export function buildAgents(configs: ResolvedAgentConfig[]): BaseAgent[] {
  return configs.map((config) => createAgent(config));
}

export function createAgent(config: ResolvedAgentConfig): BaseAgent {
  switch (config.type) {
    case 'geometric-mind':
      return new GeometricMind(config);
    case 'organic-flow':
      return new OrganicFlow(config);
    case 'pixel-punk':
      return new PixelPunk(config);
    case 'minimalist-zen':
      return new MinimalistZen(config);
    case 'chaos-crafter':
      return new ChaosCrafter(config);
    case 'pattern-weaver':
      return new PatternWeaver(config);
    case 'quantum-painter':
      return new QuantumPainter(config);
    case 'retro-bot':
      return new RetroBot(config);
    case 'natural-code':
      return new NaturalCode(config);
    case 'meme-painter':
      return new MemePainter(config);
    default:
      throw new Error(`Unknown agent type: ${config.type}`);
  }
}
