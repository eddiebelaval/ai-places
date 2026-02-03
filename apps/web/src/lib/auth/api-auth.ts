import { NextRequest } from 'next/server';

export function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export function verifyAdminAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return { valid: false, error: 'Admin endpoint not configured' };
  }

  if (!authHeader) {
    return { valid: false, error: 'Authorization header required' };
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (token !== adminSecret) {
    return { valid: false, error: 'Invalid admin credentials' };
  }

  return { valid: true };
}

export function verifyServiceAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return true;
  }

  return false;
}
