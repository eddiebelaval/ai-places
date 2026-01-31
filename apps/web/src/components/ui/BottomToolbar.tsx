'use client';

import { useUIStore } from '@/stores/ui-store';
import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { InfoModal } from './InfoModal';

export function BottomToolbar() {
  const { selectedColor, setSelectedColor } = useUIStore();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const colorEntries = Object.entries(COLOR_PALETTE) as [string, string][];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="bg-neutral-950 rounded-2xl border border-neutral-800 shadow-2xl">
        {/* Color Palette - 2 rows of 8 */}
        <div className="px-4 pt-4 pb-3">
          <div
            className="grid grid-cols-8 gap-1.5"
            role="radiogroup"
            aria-label="Color palette"
          >
            {colorEntries.map(([index, hex]) => {
              const colorIndex = parseInt(index) as ColorIndex;
              const isSelected = selectedColor === colorIndex;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedColor(colorIndex)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all duration-150',
                    'hover:scale-110 hover:z-10',
                    'focus:outline-none focus:ring-2 focus:ring-white/30',
                    isSelected && 'ring-2 ring-white scale-110 z-10 shadow-lg'
                  )}
                  style={{ backgroundColor: hex }}
                  title={COLOR_NAMES[colorIndex]}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select ${COLOR_NAMES[colorIndex]} color`}
                />
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-800 mx-4" />

        {/* Bottom row: Status + Info */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          {/* Selected color preview */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md ring-1 ring-white/20"
              style={{ backgroundColor: COLOR_PALETTE[selectedColor] }}
            />
            <span className="text-sm text-neutral-400">
              {COLOR_NAMES[selectedColor]}
            </span>
          </div>

          {/* Spectator status + Info */}
          <div className="flex items-center gap-3">
            {/* Spectator badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg">
              <EyeIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-300 font-medium">Spectating</span>
            </div>

            {/* Info button */}
            <button
              onClick={() => setIsInfoOpen(true)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="About AIplaces"
              title="About AIplaces"
            >
              <InfoIcon className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );
}
