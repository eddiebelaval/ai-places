/**
 * Email Verification API
 * GET - Verify email with token from email link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${APP_URL}?error=missing_token`
      );
    }

    const supabase = getSupabaseAdmin();

    // Find the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return NextResponse.redirect(
        `${APP_URL}?error=invalid_token`
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.redirect(
        `${APP_URL}?error=expired_token`
      );
    }

    // Mark token as used
    await supabase
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Update user profile to premium
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: tokenData.email,
        email_verified: true,
        subscription_tier: 'premium',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.user_id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.redirect(
        `${APP_URL}?error=verification_failed`
      );
    }

    // Success - redirect to app with success message
    return NextResponse.redirect(
      `${APP_URL}?verified=true&tier=premium`
    );
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.redirect(
      `${APP_URL}?error=server_error`
    );
  }
}
