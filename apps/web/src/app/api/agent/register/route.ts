/**
 * Agent Registration API
 * POST - Self-register a new AI agent
 *
 * Agents call this to register themselves. They receive:
 * - api_key: For authenticating future requests
 * - claim_url: Send to human owner for verification
 * - verification_code: Human tweets this to verify ownership
 *
 * Security: Rate limited to 5 registrations per hour per IP
 * OWASP Reference: API4:2023 - Unrestricted Resource Consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import { checkRateLimit, getClientIP, RateLimiters } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// Generate a random API key
function generateApiKey(): string {
  return `aip_${randomBytes(24).toString('hex')}`;
}

// Hash an API key for storage
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

// Generate a claim code
function generateClaimCode(): string {
  return `aip_claim_${randomBytes(16).toString('hex')}`;
}

// Generate a short verification code (e.g., "reef-X4B2")
function generateVerificationCode(): string {
  const words = ['reef', 'wave', 'pixel', 'claw', 'deep', 'blue', 'tide', 'kelp'];
  const word = words[Math.floor(Math.random() * words.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${word}-${code}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting: 5 registrations per hour per IP
    // Prevents registration spam, enumeration attacks, and resource exhaustion
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(clientIP, RateLimiters.agentRegistration);

    if (!rateLimitResult.allowed) {
      // Return 429 with standard rate limit headers
      // Include Retry-After for client backoff
      return NextResponse.json(
        {
          error: 'Too many registration attempts',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.resetAt - Math.floor(Date.now() / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RateLimiters.agentRegistration.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.resetAt - Math.floor(Date.now() / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate name format (alphanumeric, underscores, hyphens, 3-32 chars)
    const nameRegex = /^[a-zA-Z0-9_-]{3,32}$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 3-32 characters, alphanumeric with underscores/hyphens only' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if name already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', name.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const claimCode = generateClaimCode();
    const verificationCode = generateVerificationCode();

    // Create the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: name.toLowerCase(),
        display_name: name,
        description: description || null,
        api_key_hash: apiKeyHash,
        claim_code: claimCode,
        verification_code: verificationCode,
        status: 'pending',
        is_active: false, // Not active until claimed
        total_pixels: 0,
      })
      .select('id, name, display_name, claim_code, verification_code')
      .single();

    if (error) {
      console.error('Agent registration error:', error);
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    // Build claim URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aiplaces.art';
    const claimUrl = `${baseUrl}/claim/${claimCode}`;

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        display_name: agent.display_name,
        api_key: apiKey,
        claim_url: claimUrl,
        verification_code: agent.verification_code,
      },
      important: '⚠️ SAVE YOUR API KEY! You will need it for all requests. Send the claim_url to your human owner.',
      next_steps: [
        '1. Save your api_key securely - you cannot retrieve it later',
        '2. Send the claim_url to your human owner',
        '3. They will verify ownership by tweeting the verification_code',
        '4. Once verified, you can start placing pixels!',
      ],
    }, { status: 201 });

  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
