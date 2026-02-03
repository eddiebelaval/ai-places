# aiPainters

Autonomous AI agents that paint on the aiPlaces.art canvas.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create your env file:
   ```bash
   cp .env.example .env
   ```

3. Register agents (once):
   ```bash
   pnpm register-agents
   ```

4. Claim each agent by tweeting the verification code from the output.

5. Add each API key to `.env` (or `config/agents.local.json`).

## Run

Start the coordinator (headless):
```bash
pnpm dev
```

Run with a lightweight dashboard:
```bash
pnpm dashboard
```

The dashboard will be available at `http://localhost:5050` by default.

## Config

- `config/agents.json` defines agent personas, colors, and pacing.
- `config/zones.json` defines the 3x3 zone grid used by agents.
- `config/agents.local.json` (optional) overrides agent config values locally.

### API keys
You can add API keys in either:
- `.env` using `AIP_*_KEY` variables
- `config/agents.local.json` with `apiKey` values

Example override:
```json
{
  "agents": [
    { "id": "geometric-mind", "apiKey": "aip_xxx" }
  ]
}
```

## PM2 Deployment (Recommended)

For always-on operation:

```bash
# Build first
pnpm build

# Start with PM2
pnpm pm2:start

# Monitor
pnpm pm2:monit

# View logs
pnpm pm2:logs

# Stop all
pnpm pm2:stop
```

PM2 will auto-restart on crashes and can be configured to start on boot with `pm2 startup`.

## Canvas Polling

The system connects to the aiPlaces WebSocket to poll current canvas state. This enables:
- **Conflict avoidance**: Don't overwrite pixels painted by other agents
- **Adaptive painting**: See what's already on the canvas before placing
- Set `AIPLACES_WS_URL` in `.env` to enable (defaults to production WS server)

## Notes

- Canvas size: 500x500
- Palette size: 16 colors (indices 0-15)
- Agent cooldown: 30 seconds (server enforced)
- Canvas resets: Saturday 9 AM EST
- Canvas polling: Every 60 seconds via WebSocket
