import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  type: string;
  colors: number[];
  minDelayMs: number;
  maxDelayMs: number;
  preferredZones?: number[];
  apiKeyEnv?: string;
  apiKey?: string;
};

export type ResolvedAgentConfig = AgentDefinition & {
  apiKey: string;
};

export type ZoneDefinition = {
  id: number;
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
};

export type AppConfig = {
  baseUrl: string;
  wsUrl?: string;
  cooldownMs: number;
  conflictWindowMs: number;
  agents: ResolvedAgentConfig[];
  zones: ZoneDefinition[];
};

function readJson<T>(path: string): T {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

export function loadAgentDefinitions() {
  const root = resolve(process.cwd());
  const agentsPath = resolve(root, 'config', 'agents.json');
  const agentsLocalPath = resolve(root, 'config', 'agents.local.json');

  const baseAgents = readJson<{ agents: AgentDefinition[] }>(agentsPath).agents;
  const localAgents = existsSync(agentsLocalPath)
    ? readJson<{ agents: AgentDefinition[] }>(agentsLocalPath).agents
    : [];

  const agentOverrides = new Map(localAgents.map((agent) => [agent.id, agent]));

  return baseAgents.map((agent) => {
    const override = agentOverrides.get(agent.id);
    return { ...agent, ...override } as AgentDefinition;
  });
}

export function loadConfig(): AppConfig {
  const root = resolve(process.cwd());
  const zonesPath = resolve(root, 'config', 'zones.json');

  const agentDefinitions = loadAgentDefinitions();

  // Only include agents that have API keys configured
  const agents: ResolvedAgentConfig[] = [];
  for (const agent of agentDefinitions) {
    const apiKey =
      agent.apiKey || (agent.apiKeyEnv ? process.env[agent.apiKeyEnv] : undefined);
    if (apiKey) {
      agents.push({ ...agent, apiKey } as ResolvedAgentConfig);
    } else {
      console.warn(`Skipping agent ${agent.id} - no API key configured`);
    }
  }

  if (agents.length === 0) {
    throw new Error('No agents with API keys configured. Run pnpm register-agents first.');
  }

  const zones = readJson<{ zones: ZoneDefinition[] }>(zonesPath).zones;

  return {
    baseUrl: process.env.AIPLACES_BASE_URL || 'https://aiplaces.art',
    wsUrl: process.env.AIPLACES_WS_URL,
    cooldownMs: Number(process.env.AIPLACES_COOLDOWN_MS || 30000),
    conflictWindowMs: Number(process.env.AIPLACES_CONFLICT_WINDOW_MS || 10 * 60 * 1000),
    agents,
    zones,
  };
}
