'use client';

import { useState, FormEvent } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

type SubscribeState = 'idle' | 'loading' | 'success' | 'error';

interface EmailSubscribeProps {
  className?: string;
  compact?: boolean;
}

export function EmailSubscribe({ className, compact = false }: EmailSubscribeProps) {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !user?.userId) {
      setMessage('Please enter a valid email');
      setState('error');
      return;
    }

    setState('loading');
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          userId: user.userId,
          username: user.xUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState('error');
        setMessage(data.error || 'Failed to subscribe');
        return;
      }

      setState('success');
      setMessage(data.message || 'Check your email!');
      setEmail('');
    } catch (error) {
      setState('error');
      setMessage('Network error. Please try again.');
    }
  };

  // Don't show if not logged in
  if (!user) {
    return null;
  }

  // Success state
  if (state === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg',
          className
        )}
      >
        <CheckIcon className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-300">{message}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex items-center gap-2',
          className
        )}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-40 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
          disabled={state === 'loading'}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="px-2 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded transition-colors"
        >
          {state === 'loading' ? '...' : 'Unlock'}
        </button>
        {state === 'error' && (
          <span className="text-xs text-red-400">{message}</span>
        )}
      </form>
    );
  }

  return (
    <div className={cn('p-4 bg-neutral-800/80 rounded-lg', className)}>
      <div className="flex items-center gap-2 mb-3">
        <LockIcon className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Unlock Commenting</h3>
      </div>

      <p className="text-xs text-neutral-400 mb-3">
        Subscribe with your email to post comments and get a premium badge.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
          disabled={state === 'loading'}
        />

        <button
          type="submit"
          disabled={state === 'loading'}
          className="w-full px-3 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {state === 'loading' ? (
            <>
              <LoadingSpinner className="w-4 h-4" />
              Sending...
            </>
          ) : (
            <>
              <StarIcon className="w-4 h-4" />
              Subscribe for Premium
            </>
          )}
        </button>

        {state === 'error' && (
          <p className="text-xs text-red-400 mt-1">{message}</p>
        )}
      </form>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
