/**
 * Email Subscription API
 * POST - Submit email for premium verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { sendVerificationEmail } from '@/lib/email/resend';

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

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, userId, username } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user already has a verified email
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email_verified, subscription_tier')
      .eq('id', userId)
      .single();

    if (existingProfile?.email_verified && existingProfile?.subscription_tier === 'premium') {
      return NextResponse.json(
        { error: 'Already subscribed as premium' },
        { status: 400 }
      );
    }

    // Check if email is already used by another user
    const { data: emailInUse } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('email_verified', true)
      .neq('id', userId)
      .single();

    if (emailInUse) {
      return NextResponse.json(
        { error: 'Email already in use by another account' },
        { status: 400 }
      );
    }

    // Check for existing pending token (rate limiting)
    const { data: existingToken } = await supabase
      .from('email_verification_tokens')
      .select('created_at')
      .eq('user_id', userId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingToken) {
      const tokenAge = Date.now() - new Date(existingToken.created_at).getTime();
      const minWait = 60 * 1000; // 1 minute between requests

      if (tokenAge < minWait) {
        return NextResponse.json(
          { error: 'Please wait before requesting another verification email' },
          { status: 429 }
        );
      }
    }

    // Generate verification token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Failed to store token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // Update user_profiles with pending email
    await supabase
      .from('user_profiles')
      .update({ email: email.toLowerCase().trim() })
      .eq('id', userId);

    // Send verification email
    const { success, error: emailError } = await sendVerificationEmail({
      email: email.toLowerCase().trim(),
      token,
      username,
    });

    if (!success) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Check your inbox.',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
