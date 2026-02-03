'use client';

import { cn } from '@/lib/utils';

interface EdgeTabProps {
  label: string;
  side: 'left' | 'right';
  isActive: boolean;
  onClick: () => void;
}

export function EdgeTab({ label, side, isActive, onClick }: EdgeTabProps) {
  const isLeft = side === 'left';

  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles - floating glass button
        'fixed z-20 hidden lg:flex items-center gap-2',
        'px-3 py-2 rounded-full',
        'bg-neutral-900/50 backdrop-blur-xl border border-white/10',
        'transition-all duration-300 ease-out',
        'hover:bg-neutral-800/60 hover:border-white/20 hover:scale-105',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
        'shadow-lg shadow-black/20',
        // Position - top corners
        'top-20',
        isLeft ? 'left-4' : 'right-4',
        // Active state - glow effect
        isActive && 'bg-amber-600/20 border-amber-500/30 shadow-amber-500/20'
      )}
      title={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-label={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={isActive}
    >
      {/* Icon */}
      {isLeft ? (
        <ActivityIcon className={cn(
          'w-4 h-4 transition-colors',
          isActive ? 'text-amber-400' : 'text-neutral-400'
        )} />
      ) : (
        <BotIcon className={cn(
          'w-4 h-4 transition-colors',
          isActive ? 'text-amber-400' : 'text-neutral-400'
        )} />
      )}

      {/* Label */}
      <span className={cn(
        'text-xs font-medium transition-colors',
        isActive ? 'text-amber-300' : 'text-neutral-300'
      )}>
        {label}
      </span>

      {/* Pulse indicator when inactive */}
      {!isActive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      )}
    </button>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M6.5 3a2.5 2.5 0 00-2.5 2.5v9A2.5 2.5 0 006.5 17h7a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0013.5 3h-7zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2zm-4 2.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z" clipRule="evenodd" />
    </svg>
  );
}
