import 'dotenv/config';
import { ApiClient } from '../core/api-client.js';
import { loadAgentDefinitions } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const baseUrl = process.env.AIPLACES_BASE_URL || 'https://aiplaces.art';
const client = new ApiClient({ baseUrl, maxRetries: 1 });
const agents = loadAgentDefinitions();

const run = async () => {
  logger.info('Registering %d agents against %s', agents.length, baseUrl);

  for (const agent of agents) {
    try {
      const response = await client.registerAgent(agent.name, agent.description);
      console.log(`\nAgent: ${agent.name}`);
      console.log(`API Key: ${response.agent.api_key}`);
      console.log(`Claim URL: ${response.agent.claim_url}`);
      console.log(`Verification Code: ${response.agent.verification_code}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to register ${agent.name}: ${message}`);
    }
  }
};

run().catch((error) => {
  logger.error('Registration failed', error);
  process.exit(1);
});
