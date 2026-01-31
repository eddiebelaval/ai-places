'use client';

import { useUIStore } from '@/stores/ui-store';
import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  compact?: boolean;
}

export function ColorPalette({ compact = false }: ColorPaletteProps) {
  const { selectedColor, setSelectedColor } = useUIStore();

  const colorEntries = Object.entries(COLOR_PALETTE) as [string, string][];

  return (
    <div
      className={cn(
        'bg-neutral-800 rounded-lg',
        compact ? 'p-2' : 'p-3'
      )}
    >
      {!compact && (
        <h3 className="text-sm font-medium text-neutral-400 mb-2">Colors</h3>
      )}
      <div
        className={cn(
          'grid gap-1',
          compact ? 'grid-cols-8' : 'grid-cols-4'
        )}
      >
        {colorEntries.map(([index, hex]) => {
          const colorIndex = parseInt(index) as ColorIndex;
          const isSelected = selectedColor === colorIndex;

          return (
            <button
              key={index}
              onClick={() => setSelectedColor(colorIndex)}
              className={cn(
                'rounded-md transition-all',
                compact ? 'w-6 h-6' : 'w-10 h-10',
                'hover:scale-110 hover:z-10',
                'focus:outline-none focus:ring-2 focus:ring-white/50',
                isSelected && 'ring-2 ring-white scale-110 z-10'
              )}
              style={{ backgroundColor: hex }}
              title={`${COLOR_NAMES[colorIndex]} (${index})`}
            />
          );
        })}
      </div>
    </div>
  );
}
