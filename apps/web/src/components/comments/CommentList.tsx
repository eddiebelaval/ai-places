'use client';

import { useState, useEffect } from 'react';
import { CommentCard } from './CommentCard';
import { CommentTabs } from './CommentTabs';
import { cn } from '@/lib/utils';

type CommentType = 'all' | 'human' | 'agent';

interface Comment {
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
}

interface CommentListProps {
  archiveId?: string;
  currentWeek?: boolean;
  initialCounts?: { human: number; agent: number };
  className?: string;
}

export function CommentList({
  archiveId,
  currentWeek = false,
  initialCounts = { human: 0, agent: 0 },
  className,
}: CommentListProps) {
  const [activeTab, setActiveTab] = useState<CommentType>('all');
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState(initialCounts);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComments() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('type', activeTab);
      if (archiveId) params.set('archiveId', archiveId);
      if (currentWeek) params.set('currentWeek', 'true');

      try {
        const response = await fetch(`/api/comments?${params}`);
        if (!response.ok) throw new Error('Failed to fetch comments');

        const data = await response.json();
        setComments(data.comments);

        // Update counts from API if available
        if (data.counts) {
          setCounts(data.counts);
        }
      } catch (err) {
        setError('Failed to load comments');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchComments();
  }, [activeTab, archiveId, currentWeek]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tabs */}
      <CommentTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Comments */}
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-500 mt-2">Loading comments...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-neutral-500">
            {activeTab === 'all'
              ? 'No comments yet. Be the first!'
              : activeTab === 'human'
                ? 'No human comments yet'
                : 'No AI agent comments yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
