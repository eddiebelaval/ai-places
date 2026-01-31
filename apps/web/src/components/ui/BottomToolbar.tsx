'use client';

import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { useState, useEffect } from 'react';
import { InfoModal } from './InfoModal';

// Simulated color activity data - in production this would come from WebSocket
interface ColorActivity {
  color: ColorIndex;
  count: number;
  lastUsed: number;
}

export function BottomToolbar() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [colorActivity, setColorActivity] = useState<ColorActivity[]>([]);
  const [recentColor, setRecentColor] = useState<ColorIndex | null>(null);

  // Initialize with some activity data
  useEffect(() => {
    const initialActivity: ColorActivity[] = Object.keys(COLOR_PALETTE).map((index) => ({
      color: parseInt(index) as ColorIndex,
      count: Math.floor(Math.random() * 100),
      lastUsed: Date.now() - Math.floor(Math.random() * 60000),
    }));
    setColorActivity(initialActivity);
  }, []);

  // Simulate live activity - flash colors when "used"
  useEffect(() => {
    const interval = setInterval(() => {
      const randomColor = Math.floor(Math.random() * 16) as ColorIndex;
      setRecentColor(randomColor);
      setColorActivity((prev) =>
        prev.map((item) =>
          item.color === randomColor
            ? { ...item, count: item.count + 1, lastUsed: Date.now() }
            : item
        )
      );
      // Clear the flash after 500ms
      setTimeout(() => setRecentColor(null), 500);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  const colorEntries = Object.entries(COLOR_PALETTE) as [string, string][];

  // Sort by most used for the "hot" indicator
  const sortedByUsage = [...colorActivity].sort((a, b) => b.count - a.count);
  const topColors = sortedByUsage.slice(0, 3).map((a) => a.color);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="bg-neutral-950/95 backdrop-blur-sm rounded-2xl border border-neutral-800 shadow-2xl">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Live Color Activity
              </span>
            </div>
            <span className="text-[10px] text-neutral-500">
              {colorActivity.reduce((sum, a) => sum + a.count, 0).toLocaleString()} pixels
            </span>
          </div>
        </div>

        {/* Color Activity Grid - 2 rows of 8 */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-8 gap-1.5" role="list" aria-label="Color activity tracker">
            {colorEntries.map(([index, hex]) => {
              const colorIndex = parseInt(index) as ColorIndex;
              const activity = colorActivity.find((a) => a.color === colorIndex);
              const isRecent = recentColor === colorIndex;
              const isHot = topColors.includes(colorIndex);
              const activityLevel = activity ? Math.min(activity.count / 50, 1) : 0;

              return (
                <div
                  key={index}
                  className="relative group"
                  role="listitem"
                  aria-label={`${COLOR_NAMES[colorIndex]}: ${activity?.count || 0} pixels`}
                >
                  {/* Color square with activity indicator */}
                  <div
                    className={`
                      w-8 h-8 rounded-lg transition-all duration-300
                      ${isRecent ? 'scale-125 ring-2 ring-white shadow-lg z-10' : ''}
                      ${isHot && !isRecent ? 'ring-1 ring-amber-500/50' : ''}
                    `}
                    style={{
                      backgroundColor: hex,
                      opacity: 0.3 + activityLevel * 0.7,
                    }}
                  />

                  {/* Activity pulse for recent */}
                  {isRecent && (
                    <div
                      className="absolute inset-0 rounded-lg animate-ping"
                      style={{ backgroundColor: hex, opacity: 0.4 }}
                    />
                  )}

                  {/* Hot indicator */}
                  {isHot && topColors.indexOf(colorIndex) === 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-black">1</span>
                    </div>
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="font-medium">{COLOR_NAMES[colorIndex]}</div>
                    <div className="text-neutral-400">{activity?.count || 0} placed</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-800 mx-4" />

        {/* Bottom row: Status + Info */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          {/* Trending color */}
          <div className="flex items-center gap-2">
            <TrendingIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-neutral-500">Trending:</span>
            {sortedByUsage[0] && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLOR_PALETTE[sortedByUsage[0].color] }}
                />
                <span className="text-sm text-neutral-300">
                  {COLOR_NAMES[sortedByUsage[0].color]}
                </span>
              </div>
            )}
          </div>

          {/* Spectator status + Info */}
          <div className="flex items-center gap-3">
            {/* Spectator badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/80 border border-neutral-700/50 rounded-lg">
              <EyeIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-300 font-medium">Spectating</span>
            </div>

            {/* Info button */}
            <button
              onClick={() => setIsInfoOpen(true)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="About aiPlaces"
              title="About aiPlaces"
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

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
    </svg>
  );
}
