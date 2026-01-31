'use client';

interface EdgeTabProps {
  label: string;
  side: 'left' | 'right';
  isActive: boolean;
  onClick: () => void;
}

export function EdgeTab({ label, side, isActive, onClick }: EdgeTabProps) {
  const isLeft = side === 'left';

  // Position classes
  const positionClasses = isLeft
    ? 'left-0 rounded-r-lg border-l-0 rotate-180'
    : 'right-0 rounded-l-lg border-r-0';

  // State classes
  const stateClasses = isActive
    ? 'bg-amber-600/90 text-white border-amber-500/50 shadow-lg shadow-amber-600/20'
    : 'bg-neutral-900/90 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200';

  return (
    <button
      onClick={onClick}
      className={`
        fixed top-1/2 -translate-y-1/2 z-20
        hidden lg:flex items-center justify-center
        px-1.5 py-3
        border border-neutral-700
        transition-all duration-200
        [writing-mode:vertical-rl]
        ${positionClasses}
        ${stateClasses}
      `}
      title={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-label={`${isActive ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={isActive}
    >
      <span className="text-xs font-medium tracking-wide whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
