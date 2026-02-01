'use client';

interface EdgeTabProps {
  label: string;
  side: 'left' | 'right';
  isActive: boolean;
  onClick: () => void;
}

export function EdgeTab({ label, side, isActive, onClick }: EdgeTabProps) {
  const isLeft = side === 'left';

  // Position classes - flat edge toward screen, rounded edge sticks out into content
  // Note: Left tab uses rounded-l-lg because rotate-180 flips it visually to the right side
  const positionClasses = isLeft
    ? 'left-0 rounded-l-lg border-l-0 rotate-180'
    : 'right-0 rounded-l-lg border-r-0';

  // State classes with enhanced transitions and hover effects
  const stateClasses = isActive
    ? 'bg-amber-600 text-white border-amber-500/50 shadow-lg shadow-amber-600/20 hover:bg-amber-500 hover:shadow-amber-500/30'
    : 'bg-neutral-900/95 text-neutral-400 border-neutral-700/80 hover:bg-neutral-800 hover:text-neutral-200 hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/50';

  return (
    <button
      onClick={onClick}
      className={`
        fixed top-1/2 -translate-y-1/2 z-20
        hidden lg:flex items-center justify-center
        px-2 py-4
        border backdrop-blur-sm
        transition-all duration-300 ease-out
        [writing-mode:vertical-rl]
        active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950
        ${positionClasses}
        ${stateClasses}
      `}
      title={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-label={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={isActive}
    >
      <span className="text-xs font-semibold tracking-wider whitespace-nowrap uppercase transition-transform duration-300">
        {label}
      </span>
    </button>
  );
}
