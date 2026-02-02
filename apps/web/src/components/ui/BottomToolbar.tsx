'use client';

import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { useState, useEffect } from 'react';
import { InfoModal } from './InfoModal';

// Color activity tracked from real WebSocket events
interface ColorActivity {
  color: ColorIndex;
  count: number;
  lastUsed: number;
}

export function BottomToolbar() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [colorActivity, setColorActivity] = useState<ColorActivity[]>([]);
  const [recentColor, setRecentColor] = useState<ColorIndex | null>(null);
  const [totalPixels, setTotalPixels] = useState(0);

  // Initialize empty activity tracking
  useEffect(() => {
    const initialActivity: ColorActivity[] = Object.keys(COLOR_PALETTE).map((index) => ({
      color: parseInt(index) as ColorIndex,
      count: 0,
      lastUsed: 0,
    }));
    setColorActivity(initialActivity);
  }, []);

  // Listen for real pixel_activity events
  useEffect(() => {
    const handlePixelActivity = (event: CustomEvent) => {
      const { color } = event.detail;
      if (color === undefined) return;

      setRecentColor(color);
      setColorActivity((prev) =>
        prev.map((item) =>
          item.color === color
            ? { ...item, count: item.count + 1, lastUsed: Date.now() }
            : item
        )
      );
      setTotalPixels((prev) => prev + 1);

      // Clear the flash after 500ms
      setTimeout(() => setRecentColor(null), 500);
    };

    window.addEventListener('pixel_activity', handlePixelActivity as EventListener);
    return () => {
      window.removeEventListener('pixel_activity', handlePixelActivity as EventListener);
    };
  }, []);

  const colorEntries = Object.entries(COLOR_PALETTE) as [string, string][];

  // Sort by most used for the "hot" indicator
  const sortedByUsage = [...colorActivity].sort((a, b) => b.count - a.count);
  const trendingColor = sortedByUsage[0];
  const hasActivity = totalPixels > 0;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="bg-neutral-950/90 backdrop-blur-md rounded-full border border-neutral-800/50 shadow-2xl px-2 py-1.5 flex items-center gap-2">
        {/* Trending indicator */}
        {hasActivity && trendingColor?.count > 0 && (
          <div className="flex items-center gap-1.5 pl-2 pr-1 border-r border-neutral-700/50">
            <TrendingIcon className="w-3.5 h-3.5 text-amber-500" />
            <div
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: COLOR_PALETTE[trendingColor.color] }}
            />
            <span className="text-[11px] text-neutral-400 font-medium pr-2">
              {COLOR_NAMES[trendingColor.color]}
            </span>
          </div>
        )}

        {/* Color bar - all 16 colors in a row */}
        <div className="flex items-center gap-0.5" role="list" aria-label="Color palette">
          {colorEntries.map(([index, hex]) => {
            const colorIndex = parseInt(index) as ColorIndex;
            const activity = colorActivity.find((a) => a.color === colorIndex);
            const isRecent = recentColor === colorIndex;
            const isTrending = hasActivity && trendingColor?.color === colorIndex && trendingColor.count > 0;

            return (
              <div
                key={index}
                className="relative group"
                role="listitem"
                aria-label={`${COLOR_NAMES[colorIndex]}${activity?.count ? `: ${activity.count} pixels` : ''}`}
              >
                <div
                  className={`
                    w-5 h-5 rounded-sm transition-all duration-200
                    ${isRecent ? 'scale-125 ring-2 ring-white shadow-lg z-10' : 'hover:scale-110'}
                    ${isTrending && !isRecent ? 'ring-1 ring-amber-500/60' : ''}
                  `}
                  style={{ backgroundColor: hex }}
                />

                {/* Activity pulse */}
                {isRecent && (
                  <div
                    className="absolute inset-0 rounded-sm animate-ping"
                    style={{ backgroundColor: hex, opacity: 0.5 }}
                  />
                )}

                {/* Count badge for active colors */}
                {hasActivity && (activity?.count || 0) > 0 && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  {COLOR_NAMES[colorIndex]}
                  {activity?.count ? ` (${activity.count})` : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Spectator badge */}
        <div className="flex items-center gap-1.5 pl-1 pr-2 border-l border-neutral-700/50">
          <EyeIcon className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-[11px] text-neutral-400 font-medium">Spectating</span>
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

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
    </svg>
  );
}
