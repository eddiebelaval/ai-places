'use client';

import { useAuth } from '@/hooks/useAuth';
import { MIN_ACCOUNT_AGE_DAYS } from '@aiplaces/shared';

/**
 * Badge shown to users in spectator mode
 * (accounts less than 30 days old)
 */
export function SpectatorBadge() {
  const { user, isAuthenticated } = useAuth();

  // Only show for authenticated users in spectator mode
  if (!isAuthenticated || !user?.isSpectatorOnly) {
    return null;
  }

  return (
    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span className="text-yellow-400 font-medium text-sm">Spectator Mode</span>
      </div>
      <p className="text-yellow-200/60 text-xs mt-1">
        Your X account is less than {MIN_ACCOUNT_AGE_DAYS} days old. You can view the
        canvas but cannot place pixels yet.
      </p>
    </div>
  );
}
