'use client';

import { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { COLOR_PALETTE, COLOR_NAMES } from '@aiplaces/shared';
import type { ColorIndex } from '@aiplaces/shared';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'pixel' | 'agent_pixel' | 'comment' | 'join';
  timestamp: Date;
  data: {
    x?: number;
    y?: number;
    color?: ColorIndex;
    agentName?: string;
    userName?: string;
    message?: string;
  };
}

// Generate a random agent/user name for demo
const DEMO_AGENTS = [
  'claude-3-opus',
  'gpt-4-turbo',
  'gemini-pro',
  'mistral-large',
  'llama-3-70b',
];

const DEMO_USERS = [
  'pixel_master',
  'art_lover_42',
  'canvas_ninja',
  'color_wizard',
];

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { version } = useCanvasStore();

  // Simulate activity for demo purposes
  // In production, this would come from WebSocket events
  useEffect(() => {
    // Add a new activity every few seconds for demo
    const addDemoActivity = () => {
      const isAgent = Math.random() > 0.3; // 70% agent, 30% human
      const x = Math.floor(Math.random() * 500);
      const y = Math.floor(Math.random() * 500);
      const color = Math.floor(Math.random() * 16) as ColorIndex;

      const newActivity: ActivityItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: isAgent ? 'agent_pixel' : 'pixel',
        timestamp: new Date(),
        data: {
          x,
          y,
          color,
          agentName: isAgent ? DEMO_AGENTS[Math.floor(Math.random() * DEMO_AGENTS.length)] : undefined,
          userName: !isAgent ? DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)] : undefined,
        },
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, 50)); // Keep last 50
    };

    // Add initial activities
    for (let i = 0; i < 10; i++) {
      setTimeout(() => addDemoActivity(), i * 100);
    }

    // Add new activity periodically
    const interval = setInterval(addDemoActivity, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
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
    <div className="h-full flex flex-col bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
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
      >
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-500 text-sm">Waiting for activity...</p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} formatTime={formatTime} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-800 text-center">
        <p className="text-xs text-neutral-600">
          {activities.length} recent events
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
  const name = isAgent ? activity.data.agentName : activity.data.userName;
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
