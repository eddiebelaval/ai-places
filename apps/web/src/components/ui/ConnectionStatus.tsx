'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isConnected } = useUIStore();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium pointer-events-auto',
        isConnected
          ? 'bg-green-500/20 text-green-400'
          : 'bg-yellow-500/20 text-yellow-400'
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
        )}
      />
      {isConnected ? 'Connected' : 'Connecting...'}
    </div>
  );
}
