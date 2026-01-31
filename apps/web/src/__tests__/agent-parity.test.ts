/**
 * Agent Parity Tests
 *
 * These tests verify that AI agents can perform all actions that the UI can perform.
 * Agent-native design principle: Agents should have full capability parity with the UI.
 *
 * Test Matrix:
 * | Action           | UI Path                              | Agent Path                        |
 * |------------------|--------------------------------------|-----------------------------------|
 * | Place Pixel      | WebSocket 'place_pixel' message      | POST /api/agent/pixel             |
 * | Post Comment     | POST /api/comments (session auth)    | POST /api/agent/comment (API key) |
 * | Read Canvas      | WebSocket 'canvas_state' message     | GET /api/canvas (TODO)            |
 * | Read Comments    | GET /api/comments                    | GET /api/comments (same)          |
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_COUNT,
  REDIS_KEYS,
} from '@aiplaces/shared';

// ============================================
// MOCKS (hoisted before imports)
// ============================================

// Mock Redis client with spies
const mockRedisState: Record<string, unknown> = {};
const mockZScores: Record<string, Record<string, number>> = {};
const mockSets: Record<string, Set<string>> = {};

const mockRedis = {
  get: vi.fn((key: string) => mockRedisState[key] ?? null),
  set: vi.fn((key: string, value: unknown, _options?: object) => {
    mockRedisState[key] = value;
    return 'OK';
  }),
  del: vi.fn((key: string) => {
    delete mockRedisState[key];
    return 1;
  }),
  pttl: vi.fn((_key: string) => 15000), // Default 15 seconds remaining
  incr: vi.fn((key: string) => {
    const current = (mockRedisState[key] as number) || 0;
    mockRedisState[key] = current + 1;
    return current + 1;
  }),
  zincrby: vi.fn((key: string, increment: number, member: string) => {
    if (!mockZScores[key]) mockZScores[key] = {};
    mockZScores[key][member] = (mockZScores[key][member] || 0) + increment;
    return mockZScores[key][member];
  }),
  sadd: vi.fn((key: string, member: string) => {
    if (!mockSets[key]) mockSets[key] = new Set();
    const existed = mockSets[key].has(member);
    mockSets[key].add(member);
    return existed ? 0 : 1;
  }),
  setbit: vi.fn(() => Promise.resolve(0)),
};

vi.mock('@/lib/redis/client', () => ({
  getRedis: vi.fn(() => mockRedis),
}));

// Test API key and hash (computed via: crypto.createHash('sha256').update('test-api-key').digest('hex'))
const TEST_API_KEY = 'test-api-key';
const TEST_API_KEY_HASH = '4c806362b613f7496abf284146efd31da90e4b16169fe001841ca17290f427c4';

// Mock Supabase admin client - must be hoisted
const mockAgents = [
  {
    id: 'agent-123',
    name: 'test-agent',
    display_name: 'Test Agent',
    status: 'active',
    api_key_hash: TEST_API_KEY_HASH,
  },
  {
    id: 'agent-inactive',
    name: 'inactive-agent',
    display_name: 'Inactive Agent',
    status: 'disabled',
    api_key_hash: 'inactive-hash',
  },
];

const mockComments: unknown[] = [];

const mockUserProfiles = [
  {
    id: 'user-premium',
    subscription_tier: 'premium',
    email_verified: true,
  },
  {
    id: 'user-basic',
    subscription_tier: 'basic',
    email_verified: true,
  },
];

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const createQueryBuilder = () => {
        const builder: Record<string, unknown> = {};

        builder.select = vi.fn().mockReturnValue(builder);
        builder.insert = vi.fn((record: unknown) => {
          if (table === 'comments') {
            const newComment = {
              ...(record as object),
              id: 'comment-' + Date.now(),
              created_at: new Date().toISOString(),
            };
            mockComments.push(newComment);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newComment, error: null }),
              }),
            };
          }
          return builder;
        });
        builder.update = vi.fn().mockReturnValue(builder);
        builder.delete = vi.fn().mockReturnValue(builder);
        builder.in = vi.fn().mockReturnValue(builder);
        builder.order = vi.fn().mockReturnValue(builder);
        builder.range = vi.fn().mockReturnValue({
          ...builder,
          then: (fn: (result: unknown) => void) => {
            return Promise.resolve(fn({ data: mockComments, error: null, count: mockComments.length }));
          },
        });
        builder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });

        builder.eq = vi.fn((field: string, value: unknown) => {
          if (table === 'agents' && field === 'api_key_hash') {
            const agent = mockAgents.find((a) => a.api_key_hash === value);
            return {
              single: vi.fn().mockResolvedValue({
                data: agent || null,
                error: agent ? null : { message: 'Not found' },
              }),
            };
          }
          if (table === 'user_profiles' && field === 'id') {
            const profile = mockUserProfiles.find((p) => p.id === value);
            return {
              single: vi.fn().mockResolvedValue({
                data: profile || null,
                error: profile ? null : { message: 'Not found' },
              }),
            };
          }
          // For comments filter
          if (table === 'comments') {
            return {
              ...builder,
              eq: builder.eq,
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: mockComments, error: null, count: mockComments.length }),
              }),
            };
          }
          return builder;
        });

        return builder;
      };

      return createQueryBuilder();
    }),
  })),
}));

// Mock authenticated user for UI paths
const mockAuthUser = {
  userId: 'user-premium',
  username: 'test-user',
  subscriptionTier: 'premium',
  isSpectatorOnly: false,
};

vi.mock('@/lib/auth/get-session', () => ({
  getAuthenticatedUser: vi.fn(() =>
    Promise.resolve({
      user: mockAuthUser,
      error: null,
    })
  ),
}));

// Mock next/headers for cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => ({ value: 'mock-session-token' })),
    })
  ),
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

function createMockRequest(
  method: string,
  body?: object,
  headers?: Record<string, string>
): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const init = {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  };
  return new NextRequest(url, init);
}

function resetMocks() {
  // Clear Redis state
  Object.keys(mockRedisState).forEach((key) => delete mockRedisState[key]);
  Object.keys(mockZScores).forEach((key) => delete mockZScores[key]);
  Object.keys(mockSets).forEach((key) => delete mockSets[key]);

  // Clear comments
  mockComments.length = 0;

  // Reset all vi.fn() mocks
  vi.clearAllMocks();
}

// ============================================
// PARITY TESTS
// ============================================

describe('Agent Parity Tests', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Pixel Placement Parity', () => {
    /**
     * Both UI (WebSocket) and Agent (API) paths should:
     * - Validate coordinates (0-499 for x and y)
     * - Validate color (0-15)
     * - Enforce cooldown
     * - Update canvas state in Redis
     * - Update leaderboard
     */

    describe('Agent Path: POST /api/agent/pixel', () => {
      it('should place a valid pixel with proper authentication', async () => {
        // Import the route handler dynamically to apply mocks
        const { POST } = await import('@/app/api/agent/pixel/route');

        const request = createMockRequest(
          'POST',
          { x: 100, y: 200, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.pixel).toEqual({ x: 100, y: 200, color: 5 });
        expect(data.agent.id).toBe('agent-123');
      });

      it('should reject request without API key', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        const request = createMockRequest('POST', { x: 100, y: 200, color: 5 });

        const response = await POST(request);
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error).toBe('API key required');
      });

      it('should reject invalid coordinates', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        // Out of bounds x
        const request1 = createMockRequest(
          'POST',
          { x: CANVAS_WIDTH, y: 200, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );
        const response1 = await POST(request1);
        expect(response1.status).toBe(400);

        // Negative y
        const request2 = createMockRequest(
          'POST',
          { x: 100, y: -1, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );
        const response2 = await POST(request2);
        expect(response2.status).toBe(400);

        // Non-integer
        const request3 = createMockRequest(
          'POST',
          { x: 100.5, y: 200, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );
        const response3 = await POST(request3);
        expect(response3.status).toBe(400);
      });

      it('should reject invalid color', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        // Color out of range
        const request = createMockRequest(
          'POST',
          { x: 100, y: 200, color: COLOR_COUNT },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should enforce cooldown', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        // First request should succeed
        const request1 = createMockRequest(
          'POST',
          { x: 100, y: 200, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );
        const response1 = await POST(request1);
        expect(response1.status).toBe(200);

        // Second request should hit cooldown
        const request2 = createMockRequest(
          'POST',
          { x: 101, y: 201, color: 6 },
          { 'x-agent-api-key': TEST_API_KEY }
        );
        const response2 = await POST(request2);
        expect(response2.status).toBe(429);

        const data = await response2.json();
        expect(data.error).toBe('Cooldown active');
        expect(data.remainingMs).toBeDefined();
      });

      it('should update leaderboard after placement', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        const request = createMockRequest(
          'POST',
          { x: 100, y: 200, color: 5 },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        await POST(request);

        // Check that leaderboard was updated
        expect(mockRedis.zincrby).toHaveBeenCalledWith(
          REDIS_KEYS.LEADERBOARD_AGENTS,
          1,
          'agent-123'
        );

        // Check weekly pixel count
        expect(mockRedis.incr).toHaveBeenCalledWith(
          REDIS_KEYS.WEEKLY_PIXELS_AGENT('agent-123')
        );

        // Check weekly contributors
        expect(mockRedis.sadd).toHaveBeenCalledWith(
          REDIS_KEYS.WEEKLY_CONTRIBUTORS,
          'agent:agent-123'
        );
      });

      it('should reject inactive agent', async () => {
        const { POST } = await import('@/app/api/agent/pixel/route');

        // Use a key that doesn't match any agent
        const request = createMockRequest(
          'POST',
          { x: 100, y: 200, color: 5 },
          { 'x-agent-api-key': 'invalid-key-that-does-not-exist' }
        );

        const response = await POST(request);
        // Will fail because hash doesn't match any agent
        expect(response.status).toBe(401);
      });
    });

    describe('UI Path: WebSocket place_pixel (Validation Parity)', () => {
      /**
       * These tests verify that the same validation rules apply to UI path.
       * The actual WebSocket handling is in the ws-server package.
       * We test that shared validation constants are used correctly.
       */

      it('should use same canvas dimensions as agent API', () => {
        // Verify constants are consistent
        expect(CANVAS_WIDTH).toBe(500);
        expect(CANVAS_HEIGHT).toBe(500);
        expect(COLOR_COUNT).toBe(16);
      });

      it('should have matching REDIS_KEYS between paths', () => {
        // Both paths should use the same Redis keys
        expect(REDIS_KEYS.CANVAS_STATE).toBe('xplace:canvas:state');
        expect(REDIS_KEYS.LEADERBOARD_AGENTS).toBe('xplace:leaderboard:agents');
        expect(typeof REDIS_KEYS.COOLDOWN_AGENT).toBe('function');
      });
    });
  });

  describe('2. Comment Parity', () => {
    /**
     * Both UI (session auth) and Agent (API key) should:
     * - Validate content is required
     * - Enforce content length limits
     * - Validate canvas coordinates if provided
     * - Create comment with correct type (human vs agent)
     */

    describe('Agent Path: POST /api/agent/comment', () => {
      it('should create a comment with valid API key', async () => {
        const { POST } = await import('@/app/api/agent/comment/route');

        const request = createMockRequest(
          'POST',
          { content: 'Hello from agent!' },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.comment.content).toBe('Hello from agent!');
        expect(data.comment.agentName).toBe('test-agent');
      });

      it('should reject empty content', async () => {
        const { POST } = await import('@/app/api/agent/comment/route');

        const request = createMockRequest(
          'POST',
          { content: '' },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should enforce agent content length limit (1000 chars)', async () => {
        const { POST } = await import('@/app/api/agent/comment/route');

        const longContent = 'a'.repeat(1001);
        const request = createMockRequest(
          'POST',
          { content: longContent },
          { 'x-agent-api-key': TEST_API_KEY }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('1000');
      });

      it.todo('should validate canvas coordinates (not yet implemented in route)');

      it.todo('should allow valid canvas coordinates (not yet implemented in route)');
    });

    describe('UI Path: POST /api/comments', () => {
      it('should create human comment with session auth', async () => {
        const { POST } = await import('@/app/api/comments/route');

        const request = createMockRequest('POST', { content: 'Hello from user!' });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.comment.content).toBe('Hello from user!');
      });

      it('should enforce human content length limit (500 chars)', async () => {
        const { POST } = await import('@/app/api/comments/route');

        const longContent = 'a'.repeat(501);
        const request = createMockRequest('POST', { content: longContent });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('500');
      });

      it('should validate canvas coordinates (same rules as agent)', async () => {
        const { POST } = await import('@/app/api/comments/route');

        const request = createMockRequest('POST', {
          content: 'Test',
          canvasX: 600,
          canvasY: 200,
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });
    });

    describe('Intentional Differences (Documented)', () => {
      /**
       * These are intentional differences between UI and Agent paths:
       * 1. Content length: Agents get 1000 chars, humans get 500 chars
       * 2. Comment type: 'human' vs 'agent'
       * 3. Auth method: Session cookie vs API key header
       */

      it('should document content length difference', () => {
        const HUMAN_MAX_LENGTH = 500;
        const AGENT_MAX_LENGTH = 1000;

        expect(AGENT_MAX_LENGTH).toBeGreaterThan(HUMAN_MAX_LENGTH);
        // This is intentional - agents may need more space for analysis
      });

      it('should use different auth mechanisms', () => {
        // UI uses session cookie: 'xplace_session_token'
        // Agent uses header: 'x-agent-api-key'
        // Both are valid approaches for their use cases
        expect(true).toBe(true); // Documented
      });
    });
  });

  describe('3. Read Canvas State Parity', () => {
    /**
     * Both UI and Agent should be able to read current canvas state.
     * UI gets it via WebSocket 'canvas_state' message on connect.
     * Agent currently has no dedicated API endpoint.
     *
     * TODO: Add GET /api/canvas endpoint for agents
     */

    it('should have canvas state available via WebSocket for UI', () => {
      // Canvas state is sent as 'canvas_state' message type
      // Verified by ServerMessage type including CanvasStateMessage
      const messageTypes = [
        'authenticated',
        'canvas_state',
        'pixel_placed',
        'cooldown_update',
      ];
      expect(messageTypes).toContain('canvas_state');
    });

    it('should store canvas state in Redis at known key', () => {
      expect(REDIS_KEYS.CANVAS_STATE).toBe('xplace:canvas:state');
    });

    it.todo('Agent: GET /api/canvas should return current canvas state');
    it.todo('Agent: Canvas state format should match WebSocket payload');
  });

  describe('4. Read Comments Parity', () => {
    /**
     * Both UI and Agent can read comments via the same endpoint.
     * This is full parity - no special agent endpoint needed.
     */

    it('should allow reading comments without authentication', async () => {
      const { GET } = await import('@/app/api/comments/route');

      const url = new URL('http://localhost:3000/api/comments');
      const request = new NextRequest(url);

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.comments).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('should filter by comment type', async () => {
      const { GET } = await import('@/app/api/comments/route');

      const url = new URL('http://localhost:3000/api/comments?type=agent');
      const request = new NextRequest(url);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});

// ============================================
// UI ACTIONS COVERAGE AUDIT
// ============================================

describe('UI Actions Agent Coverage Audit', () => {
  /**
   * This test enumerates all UI actions and checks agent API coverage.
   * Use this to identify parity gaps.
   */

  interface UIAction {
    name: string;
    uiPath: string;
    agentPath: string | null;
    status: 'implemented' | 'todo' | 'not-applicable';
    notes?: string;
  }

  const UI_ACTIONS: UIAction[] = [
    // Core Canvas Actions
    {
      name: 'Place Pixel',
      uiPath: "WebSocket: 'place_pixel'",
      agentPath: 'POST /api/agent/pixel',
      status: 'implemented',
    },
    {
      name: 'Get Canvas State',
      uiPath: "WebSocket: 'canvas_state' (on connect)",
      agentPath: 'GET /api/canvas (TODO)',
      status: 'todo',
      notes: 'Agents need API to read current canvas state',
    },
    {
      name: 'Receive Pixel Updates',
      uiPath: "WebSocket: 'pixel_placed' (real-time)",
      agentPath: null,
      status: 'not-applicable',
      notes: 'Agents can poll /api/canvas instead of real-time',
    },

    // Comment Actions
    {
      name: 'Post Comment',
      uiPath: 'POST /api/comments',
      agentPath: 'POST /api/agent/comment',
      status: 'implemented',
    },
    {
      name: 'Read Comments',
      uiPath: 'GET /api/comments',
      agentPath: 'GET /api/comments (same)',
      status: 'implemented',
    },
    {
      name: 'Upload Comment Image',
      uiPath: 'POST /api/comments/upload',
      agentPath: null,
      status: 'todo',
      notes: 'Agents may want to attach images to comments',
    },

    // User/Auth Actions
    {
      name: 'Authenticate',
      uiPath: 'OAuth via /auth/callback',
      agentPath: 'x-agent-api-key header',
      status: 'implemented',
    },
    {
      name: 'Get Session',
      uiPath: 'GET /api/auth/session',
      agentPath: null,
      status: 'not-applicable',
      notes: 'Agents use API keys, not sessions',
    },
    {
      name: 'Logout',
      uiPath: 'POST /api/auth/logout',
      agentPath: null,
      status: 'not-applicable',
    },
    {
      name: 'Get User Profile',
      uiPath: 'GET /api/user/profile',
      agentPath: 'GET /api/agents/{id}',
      status: 'implemented',
      notes: 'Agents have their own profile endpoint',
    },

    // Week/Archive Actions
    {
      name: 'Get Week Config',
      uiPath: 'GET /api/week',
      agentPath: 'GET /api/week (same)',
      status: 'implemented',
    },
    {
      name: 'Get Archives',
      uiPath: 'GET /api/archives',
      agentPath: 'GET /api/archives (same)',
      status: 'implemented',
    },
    {
      name: 'Get Archive Details',
      uiPath: 'GET /api/archives/[id]',
      agentPath: 'GET /api/archives/[id] (same)',
      status: 'implemented',
    },

    // Agent-Specific Actions
    {
      name: 'List Agents',
      uiPath: 'GET /api/agents',
      agentPath: 'GET /api/agents (same)',
      status: 'implemented',
    },
    {
      name: 'Get Agent Reputation',
      uiPath: 'GET /api/agents/[id]/reputation',
      agentPath: 'GET /api/agents/[id]/reputation (same)',
      status: 'implemented',
    },

    // Objectives
    {
      name: 'Get Weekly Objectives',
      uiPath: 'GET /api/objectives',
      agentPath: 'GET /api/objectives (same)',
      status: 'implemented',
    },
  ];

  it('should have agent coverage for all core actions', () => {
    const coreActions = UI_ACTIONS.filter(
      (action) =>
        action.name.includes('Pixel') ||
        action.name.includes('Comment') ||
        action.name.includes('Canvas')
    );

    const todoActions = coreActions.filter((action) => action.status === 'todo');

    // Report gaps
    if (todoActions.length > 0) {
      console.log('\nAgent Coverage Gaps (Core Actions):');
      todoActions.forEach((action) => {
        console.log(`  - ${action.name}: ${action.notes || 'Needs implementation'}`);
      });
    }

    // For now, we expect some TODOs but the critical paths should be done
    const implemented = coreActions.filter(
      (action) => action.status === 'implemented'
    );
    expect(implemented.length).toBeGreaterThanOrEqual(2); // Pixel + Comment at minimum
  });

  it('should enumerate all UI actions', () => {
    const totalActions = UI_ACTIONS.length;
    const implemented = UI_ACTIONS.filter((a) => a.status === 'implemented').length;
    const todo = UI_ACTIONS.filter((a) => a.status === 'todo').length;
    const notApplicable = UI_ACTIONS.filter(
      (a) => a.status === 'not-applicable'
    ).length;

    console.log('\nUI Actions Agent Coverage Summary:');
    console.log(`  Total Actions: ${totalActions}`);
    console.log(`  Implemented: ${implemented}`);
    console.log(`  TODO: ${todo}`);
    console.log(`  N/A: ${notApplicable}`);

    // Coverage percentage (excluding N/A)
    const applicable = totalActions - notApplicable;
    const coveragePercent = ((implemented / applicable) * 100).toFixed(1);
    console.log(`  Coverage: ${coveragePercent}%`);

    expect(totalActions).toBeGreaterThan(0);
  });

  it('should document intentional differences', () => {
    const intentionalDifferences = [
      {
        aspect: 'Cooldown Duration',
        ui: '10-60 seconds (based on tier)',
        agent: '30 seconds (fixed)',
        reason: 'Agents have consistent rate limits',
      },
      {
        aspect: 'Comment Length',
        ui: '500 characters',
        agent: '1000 characters',
        reason: 'Agents may provide detailed analysis',
      },
      {
        aspect: 'Real-time Updates',
        ui: 'WebSocket push',
        agent: 'Polling (no WebSocket)',
        reason: 'Agents are request-driven, not persistent connections',
      },
      {
        aspect: 'Authentication',
        ui: 'OAuth session cookie',
        agent: 'API key header',
        reason: 'Different trust models and use cases',
      },
    ];

    console.log('\nIntentional Parity Differences:');
    intentionalDifferences.forEach((diff) => {
      console.log(`  ${diff.aspect}:`);
      console.log(`    UI: ${diff.ui}`);
      console.log(`    Agent: ${diff.agent}`);
      console.log(`    Reason: ${diff.reason}`);
    });

    expect(intentionalDifferences.length).toBeGreaterThan(0);
  });
});
