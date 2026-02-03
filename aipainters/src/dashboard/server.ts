import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import type { Coordinator, CoordinatorEvent } from '../core/coordinator.js';

export type AgentStatus = {
  id: string;
  name: string;
  lastEventAt: number | null;
  lastPlacement?: { x: number; y: number; color: number };
  lastError?: string;
  placedCount: number;
  idleCount: number;
  errorCount: number;
};

export class DashboardServer {
  private coordinator: Coordinator;
  private events: CoordinatorEvent[] = [];
  private agents = new Map<string, AgentStatus>();
  private startedAt = Date.now();
  private wss?: WebSocketServer;

  constructor(coordinator: Coordinator) {
    this.coordinator = coordinator;
    this.coordinator.events.on('event', (event) => this.handleEvent(event));
  }

  start(port = 5050) {
    const app = express();

    app.get('/api/status', (_req, res) => {
      res.json({
        uptimeMs: Date.now() - this.startedAt,
        agents: Array.from(this.agents.values()),
        recentEvents: this.events.slice(-100),
      });
    });

    app.get('/', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(renderHtml());
    });

    const server = createServer(app);
    const wss = new WebSocketServer({ server });
    this.wss = wss;

    wss.on('connection', (socket) => {
      socket.send(
        JSON.stringify({
          type: 'snapshot',
          data: {
            uptimeMs: Date.now() - this.startedAt,
            agents: Array.from(this.agents.values()),
            events: this.events.slice(-100),
          },
        })
      );
    });

    server.listen(port, () => {
      console.log(`Dashboard server listening on http://localhost:${port}`);
    });
  }

  private handleEvent(event: CoordinatorEvent) {
    this.events.push(event);
    if (this.events.length > 200) this.events.shift();

    let status = this.agents.get(event.agentId);
    if (!status) {
      status = {
        id: event.agentId,
        name: event.agentName,
        lastEventAt: null,
        placedCount: 0,
        idleCount: 0,
        errorCount: 0,
      };
    }

    status.lastEventAt = Date.now();
    if (event.type === 'pixel_placed') {
      status.lastPlacement = event.pixel;
      status.placedCount += 1;
    } else if (event.type === 'agent_idle') {
      status.idleCount += 1;
    } else if (event.type === 'agent_error') {
      status.errorCount += 1;
      status.lastError = event.error;
    }

    this.agents.set(event.agentId, status);
    this.broadcast({ type: 'event', data: event });
  }

  private broadcast(payload: unknown) {
    if (!this.wss) return;
    const message = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }
}

function renderHtml() {
  // Using string concatenation in client JS to avoid TypeScript parsing template literals
  const clientScript = `
      const agentsEl = document.getElementById('agents');
      const eventsEl = document.getElementById('events');

      const renderAgents = (agents) => {
        agentsEl.innerHTML = '';
        agents.forEach((agent) => {
          const el = document.createElement('div');
          el.className = 'card';
          const nameEl = document.createElement('strong');
          nameEl.textContent = agent.name;
          el.appendChild(nameEl);
          const idEl = document.createElement('div');
          idEl.className = 'muted';
          idEl.textContent = agent.id;
          el.appendChild(idEl);
          const placedEl = document.createElement('div');
          placedEl.textContent = 'Placed: ' + agent.placedCount;
          el.appendChild(placedEl);
          const idleEl = document.createElement('div');
          idleEl.textContent = 'Idle: ' + agent.idleCount;
          el.appendChild(idleEl);
          const errorEl = document.createElement('div');
          errorEl.textContent = 'Error: ' + agent.errorCount;
          el.appendChild(errorEl);
          if (agent.lastError) {
            const errDetailEl = document.createElement('div');
            errDetailEl.className = 'muted';
            errDetailEl.textContent = 'Last error: ' + agent.lastError;
            el.appendChild(errDetailEl);
          }
          agentsEl.appendChild(el);
        });
      };

      const renderEvents = (events) => {
        eventsEl.innerHTML = '';
        events.forEach((event) => {
          const div = document.createElement('div');
          div.textContent = '[' + event.type + '] ' + event.agentName;
          eventsEl.appendChild(div);
        });
      };

      const ws = new WebSocket('ws://' + location.host);
      ws.addEventListener('message', (msg) => {
        const payload = JSON.parse(msg.data);
        if (payload.type === 'snapshot') {
          renderAgents(payload.data.agents);
          renderEvents(payload.data.events);
        }
        if (payload.type === 'event') {
          fetch('/api/status').then((res) => res.json()).then((data) => {
            renderAgents(data.agents);
            renderEvents(data.recentEvents);
          });
        }
      });
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>aiPainters Dashboard</title>
    <style>
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #0f1115; color: #e5e7eb; margin: 0; padding: 24px; }
      h1 { margin: 0 0 12px; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .card { background: #1b1f2a; border-radius: 8px; padding: 12px; min-width: 240px; }
      .events { max-height: 360px; overflow: auto; }
      .muted { color: #9ca3af; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>aiPainters Dashboard</h1>
    <div class="row" id="agents"></div>
    <h2>Recent events</h2>
    <div class="card events" id="events"></div>
    <script>${clientScript}</script>
  </body>
</html>`;
}
