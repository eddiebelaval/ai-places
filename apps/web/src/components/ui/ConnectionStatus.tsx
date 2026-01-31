'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isConnected, reconnectAttempts } = useUIStore();

  // Determine status level based on reconnection attempts
  const isReconnecting = !isConnected && reconnectAttempts > 0;
  const isHavingTrouble = reconnectAttempts >= 3;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium pointer-events-auto',
        isConnected
          ? 'bg-green-500/20 text-green-300'
          : isHavingTrouble
          ? 'bg-red-500/20 text-red-300'
          : 'bg-yellow-500/20 text-yellow-300'
      )}
      title={isReconnecting ? `Reconnection attempt ${reconnectAttempts}` : undefined}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected
            ? 'bg-green-400'
            : isHavingTrouble
            ? 'bg-red-400 animate-pulse'
            : 'bg-yellow-400 animate-pulse'
        )}
      />
      {isConnected
        ? 'Connected'
        : isHavingTrouble
        ? 'Reconnecting...'
        : 'Connecting...'}
    </div>
  );
}
