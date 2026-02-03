import 'dotenv/config';
import { loadConfig } from '../utils/config.js';
import { buildAgents } from '../agents/index.js';
import { Coordinator } from '../core/coordinator.js';
import { DashboardServer } from '../dashboard/server.js';
import { logger } from '../utils/logger.js';

const config = loadConfig();
const agents = buildAgents(config.agents);
const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

const coordinator = new Coordinator({
  baseUrl: config.baseUrl,
  cooldownMs: config.cooldownMs,
  conflictWindowMs: config.conflictWindowMs,
  zones: config.zones,
  agents: config.agents.map((agentConfig) => {
    const agent = agentMap.get(agentConfig.id);
    if (!agent) throw new Error(`Missing agent implementation for ${agentConfig.id}`);
    return { config: agentConfig, agent };
  }),
});

const dashboard = new DashboardServer(coordinator);
const port = Number(process.env.AIPAINTERS_DASHBOARD_PORT || 5050);

dashboard.start(port);
coordinator.start();

process.on('SIGINT', () => {
  logger.info('Shutting down...');
  coordinator.stop();
  process.exit(0);
});
