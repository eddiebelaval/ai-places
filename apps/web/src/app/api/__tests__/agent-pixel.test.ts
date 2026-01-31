/**
 * Integration tests for Agent Pixel API
 * POST /api/agent/pixel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the shared package before importing the route
vi.mock('@aiplaces/shared', () => ({
  REDIS_KEYS: {
    CANVAS_STATE: 'xplace:canvas:state',
    COOLDOWN: (userId: string) => `xplace:cooldown:${userId}`,
    COOLDOWN_AGENT: (agentId: string) => `xplace:cooldown:agent:${agentId}`,
    LEADERBOARD_AGENTS: 'xplace:leaderboard:agents',
    WEEKLY_PIXELS_AGENT: (agentId: string) => `xplace:weekly:pixels:agent:${agentId}`,
    WEEKLY_CONTRIBUTORS: 'xplace:weekly:contributors',
  },
  CANVAS_WIDTH: 500,
  CANVAS_HEIGHT: 500,
  COLOR_COUNT: 16,
  BITS_PER_PIXEL: 4,
}));

// Mock crypto module
vi.mock('crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mocked-hash'),
      })),
    })),
  },
}));

// Mock Redis client
const mockSetbit = vi.fn().mockResolvedValue(0);

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  pttl: vi.fn(),
  zincrby: vi.fn(),
  incr: vi.fn(),
  sadd: vi.fn(),
  setbit: mockSetbit,
};

vi.mock('@/lib/redis/client', () => ({
  getRedis: vi.fn(() => mockRedis),
}));

// Mock Supabase client
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

const mockSupabase = {
  from: mockFrom,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');

// Import route after mocks are set up
import { POST } from '../agent/pixel/route';

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/agent/pixel', {
    method: 'POST',
    headers: new Headers(headers),
    body: JSON.stringify(body),
  });
  return request;
}

/**
 * Helper to setup a valid agent in Supabase mock
 */
function setupValidAgent(status: 'active' | 'disabled' = 'active') {
  mockSingle.mockResolvedValue({
    data: {
      id: 'agent-123',
      name: 'test-agent',
      status,
    },
    error: null,
  });
}

/**
 * Helper to setup agent not found in Supabase mock
 */
function setupAgentNotFound() {
  mockSingle.mockResolvedValue({
    data: null,
    error: { message: 'Agent not found' },
  });
}

describe('POST /api/agent/pixel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Redis mocks to default behavior
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.pttl.mockResolvedValue(-1);
    mockRedis.zincrby.mockResolvedValue(1);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.sadd.mockResolvedValue(1);
    mockSetbit.mockResolvedValue(0);
  });

  describe('Authentication', () => {
    it('returns 401 without API key header', async () => {
      const request = createMockRequest({ x: 100, y: 100, color: 5 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('API key required');
    });

    it('returns 401 with invalid API key', async () => {
      setupAgentNotFound();
      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'invalid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid API key');
    });

    it('returns 403 when agent is disabled', async () => {
      setupValidAgent('disabled');
      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Agent is disabled');
    });
  });

  describe('Coordinate Validation', () => {
    it('returns 400 for x coordinate below 0', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: -1, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('returns 400 for x coordinate above 499', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 500, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('returns 400 for y coordinate below 0', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: -1, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('returns 400 for y coordinate above 499', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: 500, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('returns 400 for non-integer x coordinate', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100.5, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('returns 400 for non-numeric coordinates', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 'abc', y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid coordinates');
    });

    it('accepts valid boundary coordinates (0, 0)', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 0, y: 0, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pixel.x).toBe(0);
      expect(data.pixel.y).toBe(0);
    });

    it('accepts valid boundary coordinates (499, 499)', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 499, y: 499, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pixel.x).toBe(499);
      expect(data.pixel.y).toBe(499);
    });
  });

  describe('Color Validation', () => {
    it('returns 400 for color below 0', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: 100, color: -1 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid color');
    });

    it('returns 400 for color above 15', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: 100, color: 16 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid color');
    });

    it('returns 400 for non-integer color', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: 100, color: 5.5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid color');
    });

    it('returns 400 for non-numeric color', async () => {
      setupValidAgent();
      const request = createMockRequest(
        { x: 100, y: 100, color: 'red' },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid color');
    });

    it('accepts valid color 0', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 100, y: 100, color: 0 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pixel.color).toBe(0);
    });

    it('accepts valid color 15', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 100, y: 100, color: 15 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pixel.color).toBe(15);
    });
  });

  describe('Cooldown Handling', () => {
    it('returns 429 when cooldown is active', async () => {
      setupValidAgent();
      // Simulate active cooldown
      mockRedis.get.mockResolvedValue(Date.now().toString());
      mockRedis.pttl.mockResolvedValue(15000); // 15 seconds remaining

      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Cooldown active');
      expect(data.remainingMs).toBe(15000);
    });

    it('returns remainingMs from Redis TTL', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(Date.now().toString());
      mockRedis.pttl.mockResolvedValue(25000); // 25 seconds remaining

      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.remainingMs).toBe(25000);
    });
  });

  describe('Successful Pixel Placement', () => {
    it('returns 200 and pixel data on valid request', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null); // No cooldown

      const request = createMockRequest(
        { x: 250, y: 250, color: 8 },
        { 'x-agent-api-key': 'valid-key' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cooldownMs).toBe(30000);
      expect(data.pixel).toEqual({
        x: 250,
        y: 250,
        color: 8,
      });
      expect(data.agent).toEqual({
        id: 'agent-123',
        name: 'test-agent',
      });
    });

    it('updates canvas via Redis setbit operations', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      await POST(request);

      // Color 5 = 0101 in binary
      // offset = (y * 500 + x) * 4 = (100 * 500 + 100) * 4 = 200400
      // setbit is called 4 times for 4 bits (MSB first)
      expect(mockSetbit).toHaveBeenCalledTimes(4);
      expect(mockSetbit).toHaveBeenCalledWith('xplace:canvas:state', 200400, 0); // bit3 = 0
      expect(mockSetbit).toHaveBeenCalledWith('xplace:canvas:state', 200401, 1); // bit2 = 1
      expect(mockSetbit).toHaveBeenCalledWith('xplace:canvas:state', 200402, 0); // bit1 = 0
      expect(mockSetbit).toHaveBeenCalledWith('xplace:canvas:state', 200403, 1); // bit0 = 1
    });

    it('sets cooldown after successful placement', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      await POST(request);

      // Verify cooldown was set
      expect(mockRedis.set).toHaveBeenCalledWith(
        'xplace:cooldown:agent:agent-123',
        expect.any(String),
        { px: 30000 }
      );
    });

    it('updates leaderboard and stats', async () => {
      setupValidAgent();
      mockRedis.get.mockResolvedValue(null);

      const request = createMockRequest(
        { x: 100, y: 100, color: 5 },
        { 'x-agent-api-key': 'valid-key' }
      );

      await POST(request);

      // Verify leaderboard update
      expect(mockRedis.zincrby).toHaveBeenCalledWith(
        'xplace:leaderboard:agents',
        1,
        'agent-123'
      );

      // Verify weekly pixel count update
      expect(mockRedis.incr).toHaveBeenCalledWith(
        'xplace:weekly:pixels:agent:agent-123'
      );

      // Verify weekly contributors update
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'xplace:weekly:contributors',
        'agent:agent-123'
      );
    });
  });
});
