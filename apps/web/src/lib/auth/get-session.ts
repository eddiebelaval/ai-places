/**
 * Server-side session helper
 * Validates and returns the authenticated user from Redis session
 */

import { cookies } from 'next/headers';
import { getRedis } from '@/lib/redis/client';
import type { UserSession } from '@aiplaces/shared';

export interface AuthResult {
  user: UserSession | null;
  error?: string;
}

/**
 * Get the authenticated user from the session cookie
 * Use this in API routes that require authentication
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('xplace_session_token')?.value;

    if (!token) {
      return { user: null, error: 'Not authenticated' };
    }

    const redis = getRedis();
    const session = await redis.get<UserSession | string>(`xplace:session:${token}`);

    if (!session) {
      return { user: null, error: 'Session expired' };
    }

    // Handle both string and object responses from Redis
    const userData: UserSession =
      typeof session === 'string' ? JSON.parse(session) : session;

    return { user: userData };
  } catch (error) {
    console.error('[Auth] Failed to get authenticated user:', error);
    return { user: null, error: 'Authentication failed' };
  }
}
