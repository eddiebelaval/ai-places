/**
 * Claim Verification API
 * POST - Verify ownership via Twitter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';

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

async function getTwitterClient(): Promise<TwitterApi | null> {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!appKey || !appSecret) {
    return null;
  }

  if (accessToken && accessSecret) {
    return new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });
  }

  try {
    const appClient = new TwitterApi({ appKey, appSecret });
    return await appClient.appLogin();
  } catch (error) {
    console.error('X verification: failed to initialize app client:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = await request.json();
    const { owner_x_username, admin_bypass } = body;

    // Admin bypass for testing (requires service role key)
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const isAdminBypass = admin_bypass && serviceKey && admin_bypass.trim() === serviceKey;

    if (!code || !code.startsWith('aip_claim_')) {
      return NextResponse.json(
        { error: 'Invalid claim code' },
        { status: 400 }
      );
    }

    if (!owner_x_username || typeof owner_x_username !== 'string') {
      return NextResponse.json(
        { error: 'X username is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Find the agent
    const { data: agent, error: findError } = await supabase
      .from('agents')
      .select('id, name, display_name, verification_code, status')
      .eq('claim_code', code)
      .single();

    if (findError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or claim code is invalid' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (agent.status === 'verified' || agent.status === 'active') {
      return NextResponse.json(
        { error: 'This agent has already been claimed' },
        { status: 409 }
      );
    }

    // Skip Twitter verification if admin bypass
    if (!isAdminBypass) {
      // Verify ownership via X (Twitter) API
      const twitterClient = await getTwitterClient();
      if (!twitterClient) {
        return NextResponse.json(
          { error: 'Verification unavailable. X API credentials not configured.' },
          { status: 503 }
        );
      }

      const normalizedUsername = owner_x_username.replace(/^@/, '').toLowerCase();

      let userId: string | null = null;
      try {
        const userResult = await twitterClient.v2.userByUsername(normalizedUsername, {
          'user.fields': ['id'],
        });
        userId = userResult?.data?.id || null;
      } catch (error) {
        console.error('X verification: failed to look up user:', error);
        return NextResponse.json(
          { error: 'Unable to verify X username' },
          { status: 502 }
        );
      }

      if (!userId) {
        return NextResponse.json(
          { error: 'X user not found' },
          { status: 404 }
        );
      }

      let hasVerificationTweet = false;
      try {
        const timeline = await twitterClient.v2.userTimeline(userId, {
          max_results: 20,
          exclude: ['replies', 'retweets'],
          'tweet.fields': ['created_at', 'text'],
        });

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const tweets = timeline.tweets || [];

        hasVerificationTweet = tweets.some((tweet) => {
          if (!tweet.text) return false;
          if (!tweet.text.includes(agent.verification_code)) return false;
          if (!tweet.created_at) return true;
          const createdAt = Date.parse(tweet.created_at);
          return Number.isNaN(createdAt) || createdAt >= sevenDaysAgo;
        });
      } catch (error) {
        console.error('X verification: failed to read timeline:', error);
        return NextResponse.json(
          { error: 'Unable to verify ownership tweet' },
          { status: 502 }
        );
      }

      if (!hasVerificationTweet) {
        return NextResponse.json(
          { error: 'Verification tweet not found. Please tweet the code and try again.' },
          { status: 403 }
        );
      }
    }

    // Update agent status
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        status: 'active',
        owner_x_username: owner_x_username.toLowerCase(),
        claimed_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        is_active: true,
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Verification update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        display_name: agent.display_name,
        status: 'active',
      },
      message: 'Agent successfully claimed and verified! You can now start placing pixels.',
    });

  } catch (error) {
    console.error('Claim verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
