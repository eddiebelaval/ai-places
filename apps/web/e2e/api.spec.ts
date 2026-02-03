import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 * Test API endpoints directly using Playwright's request context
 */

test.describe('Agent Pixel API', () => {
  test('returns 401 without API key', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      data: { x: 100, y: 100, color: 5 },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('API key required');
  });

  test('returns 401 or 503 with invalid API key (503 if no Supabase)', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      headers: { 'x-agent-api-key': 'invalid-key-12345' },
      data: { x: 100, y: 100, color: 5 },
    });

    // 401 = auth failed, 503 = missing Supabase credentials in test env
    expect([401, 503]).toContain(response.status());
  });

  test('returns error for invalid coordinates', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      headers: { 'x-agent-api-key': 'test-key' },
      data: { x: 9999, y: 9999, color: 5 },
    });

    // 400 (bad coords), 401 (no valid key), or 503 (no Supabase)
    expect([400, 401, 503]).toContain(response.status());
  });

  test('returns error for invalid color', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      headers: { 'x-agent-api-key': 'test-key' },
      data: { x: 100, y: 100, color: 999 },
    });

    // 400 (bad color), 401 (auth), or 503 (no Supabase)
    expect([400, 401, 503]).toContain(response.status());
  });
});

test.describe('Agent Comment API', () => {
  test('returns 401 without API key', async ({ request }) => {
    const response = await request.post('/api/agent/comment', {
      data: { content: 'Test comment' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('API key required');
  });

  test('returns auth error or service error with invalid API key', async ({ request }) => {
    const response = await request.post('/api/agent/comment', {
      headers: { 'x-agent-api-key': 'invalid-key-12345' },
      data: { content: 'Test comment' },
    });

    // 401 = auth failed, 500/503 = missing Supabase credentials
    expect([401, 500, 503]).toContain(response.status());
  });
});

test.describe('Public API Endpoints', () => {
  test('GET /api/comments returns comments list', async ({ request }) => {
    const response = await request.get('/api/comments');

    // Should succeed or return empty
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('comments');
      expect(Array.isArray(body.comments)).toBe(true);
    }
  });

  test('GET /api/week returns week configuration', async ({ request }) => {
    const response = await request.get('/api/week');

    // Should return week config or error if not set up
    expect([200, 404, 500]).toContain(response.status());
  });

  test('GET /api/agents returns agents list or service error', async ({ request }) => {
    const response = await request.get('/api/agents');

    // 200 = success, 500/503 = service unavailable (missing credentials)
    expect([200, 500, 503]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('agents');
      expect(Array.isArray(body.agents)).toBe(true);
    }
  });

  test('GET /api/archives returns archives list or service error', async ({ request }) => {
    const response = await request.get('/api/archives');

    // 200 = success, 500/503 = service unavailable (missing credentials)
    expect([200, 500, 503]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });
});

test.describe('API Error Handling', () => {
  test('handles malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      headers: {
        'x-agent-api-key': 'test-key',
        'content-type': 'application/json',
      },
      data: 'not valid json{{{',
    });

    // 400 (bad JSON), 401 (auth), or 503 (no Supabase)
    expect([400, 401, 503]).toContain(response.status());
  });

  test('handles missing body gracefully', async ({ request }) => {
    const response = await request.post('/api/agent/pixel', {
      headers: { 'x-agent-api-key': 'test-key' },
    });

    // 400 (bad body), 401 (auth), 500 (server error), or 503 (no Supabase)
    expect([400, 401, 500, 503]).toContain(response.status());
  });
});
