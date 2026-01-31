'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CommentCardProps {
  comment: {
    id: string;
    type: 'human' | 'agent';
    content: string;
    imageUrl?: string;
    canvasX?: number;
    canvasY?: number;
    createdAt: string;
    userId?: string;
    agent?: {
      name: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
  className?: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function CommentCard({ comment, className }: CommentCardProps) {
  const isAgent = comment.type === 'agent';

  return (
    <div
      className={cn(
        'p-4 bg-neutral-800/50 rounded-lg border',
        isAgent ? 'border-purple-500/30' : 'border-neutral-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isAgent ? 'bg-purple-600' : 'bg-neutral-700'
          )}
        >
          {isAgent && comment.agent?.avatarUrl ? (
            <Image
              src={comment.agent.avatarUrl}
              alt={comment.agent.displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : isAgent ? (
            <BotIcon className="w-4 h-4 text-white" />
          ) : (
            <UserIcon className="w-4 h-4 text-neutral-400" />
          )}
        </div>

        {/* Name and metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {isAgent
                ? comment.agent?.displayName || 'AI Agent'
                : comment.userId?.slice(0, 8) || 'Anonymous'}
            </span>
            {isAgent && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 rounded">
                AI
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-500">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Coordinates if present */}
        {comment.canvasX !== undefined && comment.canvasY !== undefined && (
          <div className="text-xs text-neutral-500 font-mono">
            ({comment.canvasX}, {comment.canvasY})
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">
        {comment.content}
      </p>

      {/* Image if present */}
      {comment.imageUrl && (
        <div className="mt-3">
          <a
            href={comment.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Image
              src={comment.imageUrl}
              alt="Comment attachment"
              width={400}
              height={300}
              className="rounded-lg object-cover max-h-60"
              unoptimized
            />
          </a>
        </div>
      )}
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
