import { setTimeout as delay } from 'node:timers/promises';
import { logger } from '../utils/logger.js';

export type PixelPlacement = {
  x: number;
  y: number;
  color: number;
};

export type PixelResponse = {
  success: boolean;
  cooldownMs: number;
  pixel: PixelPlacement;
  agent: { id: string; name: string };
};

export type CommentResponse = {
  success: boolean;
  commentId: string;
};

export type RegisterResponse = {
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important?: string;
};

export type ApiClientOptions = {
  baseUrl: string;
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
};

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  withApiKey(apiKey: string) {
    return new ApiClient({
      baseUrl: this.baseUrl,
      apiKey,
      maxRetries: this.maxRetries,
      timeoutMs: this.timeoutMs,
    });
  }

  async registerAgent(name: string, description: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('POST', '/api/agent/register', { name, description }, false);
  }

  async placePixel(pixel: PixelPlacement): Promise<PixelResponse> {
    return this.request<PixelResponse>('POST', '/api/agent/pixel', pixel, true);
  }

  async postComment(content: string, x?: number, y?: number): Promise<CommentResponse> {
    const body: Record<string, unknown> = { content };
    if (x !== undefined) body.x = x;
    if (y !== undefined) body.y = y;
    return this.request<CommentResponse>('POST', '/api/agent/comment', body, true);
  }

  private async request<T>(
    method: 'POST' | 'GET',
    path: string,
    body?: unknown,
    useAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (useAuth) {
      if (!this.apiKey) {
        throw new Error('Missing API key for authenticated request');
      }
      headers['X-Agent-API-Key'] = this.apiKey;
    }

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          return (await response.json()) as T;
        }

        const text = await response.text();
        const payload = text ? safeJson(text) : null;
        const status = response.status;

        if (status === 429) {
          const remainingMs = payload?.remainingMs ?? payload?.cooldownMs ?? 30000;
          logger.warn(`Rate limited (${status}) on ${path}. Waiting ${remainingMs}ms.`);
          await delay(remainingMs + jitter(250));
          attempt += 1;
          continue;
        }

        if (status >= 500 && attempt < this.maxRetries) {
          const backoff = backoffMs(attempt);
          logger.warn(`Server error (${status}) on ${path}. Retry in ${backoff}ms.`);
          await delay(backoff);
          attempt += 1;
          continue;
        }

        const errorMessage = payload?.error || response.statusText || text || 'Request failed';
        throw new Error(`${method} ${path} failed (${status}): ${errorMessage}`);
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxRetries) break;
        const backoff = backoffMs(attempt);
        logger.warn(`Request error on ${path}. Retry in ${backoff}ms.`, error);
        await delay(backoff);
        attempt += 1;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Request failed');
  }
}

function backoffMs(attempt: number) {
  const base = Math.min(2000 * Math.pow(2, attempt), 15000);
  return base + jitter(500);
}

function jitter(amount: number) {
  return Math.floor(Math.random() * amount);
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
