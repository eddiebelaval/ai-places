'use client';

import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface CommentFormProps {
  archiveId?: string;
  onCommentPosted?: () => void;
  className?: string;
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function CommentForm({
  archiveId,
  onCommentPosted,
  className,
}: CommentFormProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 500;
  const remaining = maxLength - content.length;

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.userId) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.userId);

    try {
      const response = await fetch('/api/comments/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim() || !user?.userId) return;

    setState('loading');
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          content: content.trim(),
          imageUrl,
          archiveId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      setState('success');
      setContent('');
      setImageUrl(null);
      onCommentPosted?.();

      // Reset success state after 2 seconds
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div
        className={cn(
          'p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 text-center',
          className
        )}
      >
        <p className="text-sm text-neutral-400">
          Sign in with X to leave a comment
        </p>
      </div>
    );
  }

  // TODO: Check if user is premium
  // For now, show the form but it will error if not premium

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'p-4 bg-neutral-800/50 rounded-lg border border-neutral-700',
        className
      )}
    >
      {/* Text input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts..."
        className="w-full h-24 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 text-sm resize-none focus:outline-none focus:border-purple-500"
        maxLength={maxLength}
        disabled={state === 'loading'}
      />

      {/* Character count */}
      <div className="flex items-center justify-between mt-2">
        <span
          className={cn(
            'text-xs',
            remaining < 50 ? 'text-orange-400' : 'text-neutral-500'
          )}
        >
          {remaining} characters remaining
        </span>
      </div>

      {/* Image preview */}
      {imageUrl && (
        <div className="mt-3 relative inline-block">
          <Image
            src={imageUrl}
            alt="Upload preview"
            width={100}
            height={100}
            className="rounded-lg object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
          >
            X
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Success message */}
      {state === 'success' && (
        <p className="mt-2 text-xs text-green-400">Comment posted!</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || state === 'loading'}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
            title="Attach image"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!content.trim() || state === 'loading'}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {state === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </>
          ) : (
            'Post Comment'
          )}
        </button>
      </div>
    </form>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
