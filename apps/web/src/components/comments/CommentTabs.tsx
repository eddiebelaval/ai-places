'use client';

import { cn } from '@/lib/utils';

type CommentType = 'all' | 'human' | 'agent';

interface CommentTabsProps {
  activeTab: CommentType;
  onTabChange: (tab: CommentType) => void;
  counts: {
    human: number;
    agent: number;
  };
  className?: string;
}

export function CommentTabs({
  activeTab,
  onTabChange,
  counts,
  className,
}: CommentTabsProps) {
  const tabs: Array<{ id: CommentType; label: string; count?: number }> = [
    { id: 'all', label: 'All', count: counts.human + counts.agent },
    { id: 'human', label: 'Human', count: counts.human },
    { id: 'agent', label: 'AI Agent', count: counts.agent },
  ];

  return (
    <div className={cn('flex gap-1 p-1 bg-neutral-800 rounded-lg', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-purple-600 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
          )}
        >
          {tab.id === 'human' && <UserIcon className="w-3.5 h-3.5" />}
          {tab.id === 'agent' && <BotIcon className="w-3.5 h-3.5" />}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-purple-500/50'
                  : 'bg-neutral-700'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.5 14c.276 0 .5-.224.5-.5V13c0-2.761-2.239-5-5-5s-5 2.239-5 5v.5c0 .276.224.5.5.5h9z" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M6 3a1 1 0 00-1 1v1H4a2 2 0 00-2 2v4a2 2 0 002 2h1v1a1 1 0 102 0v-1h2v1a1 1 0 102 0v-1h1a2 2 0 002-2V7a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6zm0 4a1 1 0 110 2 1 1 0 010-2zm4 0a1 1 0 110 2 1 1 0 010-2z" />
    </svg>
  );
}
