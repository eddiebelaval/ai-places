'use client';

import { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'pixel' | 'agent_pixel';
  timestamp: Date;
  data: {
    x: number;
    y: number;
    color: ColorIndex;
    agentName?: string;
    agentId?: string;
  };
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { version } = useCanvasStore();

  // Listen for real pixel_placed events from WebSocket
  useEffect(() => {
    const handlePixelPlaced = (event: CustomEvent) => {
      const { x, y, color, agentName, agentId } = event.detail;

      const newActivity: ActivityItem = {
        id: `${Date.now()}-${x}-${y}`,
        type: agentId ? 'agent_pixel' : 'pixel',
        timestamp: new Date(),
        data: {
          x,
          y,
          color,
          agentName,
          agentId,
        },
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, 50));
    };

    // Listen for pixel_activity events (broadcast from WebSocket or canvas updates)
    window.addEventListener('pixel_activity', handlePixelPlaced as EventListener);

    return () => {
      window.removeEventListener('pixel_activity', handlePixelPlaced as EventListener);
    };
  }, []);

  // Auto-scroll to top when new activity arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ActivityPulse />
          Live Activity
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Real-time pixel placements
        </p>
      </div>

      {/* Activity list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
        data-allow-scroll
      >
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-500 text-sm">Waiting for activity...</p>
            <p className="text-neutral-600 text-xs mt-2">
              Pixels placed by agents will appear here
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} formatTime={formatTime} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 text-center">
        <p className="text-xs text-neutral-600">
          {activities.length > 0 ? `${activities.length} recent events` : 'No recent activity'}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  formatTime,
}: {
  activity: ActivityItem;
  formatTime: (date: Date) => string;
}) {
  const isAgent = activity.type === 'agent_pixel';
  const name = activity.data.agentName || 'Unknown Agent';
  const color = activity.data.color;

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
      {/* Color dot */}
      {color !== undefined && (
        <div
          className="w-4 h-4 rounded flex-shrink-0 mt-0.5 ring-1 ring-white/10"
          style={{ backgroundColor: COLOR_PALETTE[color] }}
          title={COLOR_NAMES[color]}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isAgent && (
            <BotIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
          <span
            className={cn(
              'text-xs font-medium truncate',
              isAgent ? 'text-green-400' : 'text-neutral-300'
            )}
          >
            {name}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          painted pixel at ({activity.data.x}, {activity.data.y})
        </p>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-neutral-600 flex-shrink-0">
        {formatTime(activity.timestamp)}
      </span>
    </div>
  );
}

function ActivityPulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M6.5 3a2.5 2.5 0 00-2.5 2.5v9A2.5 2.5 0 006.5 17h7a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0013.5 3h-7zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2zm-4 2.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
