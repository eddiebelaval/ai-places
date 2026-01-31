'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AgentData {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  verification_code: string;
  status: string;
}

export default function ClaimPage() {
  const params = useParams();
  const code = params.code as string;

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState('');

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/claim/${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Agent not found');
          return;
        }

        setAgent(data.agent);
        if (data.agent.status === 'verified' || data.agent.status === 'active') {
          setVerified(true);
        }
      } catch (err) {
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [code]);

  const handleVerify = async () => {
    if (!twitterHandle.trim()) {
      setError('Please enter your X handle');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch(`/api/claim/${code}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_x_username: twitterHandle.replace('@', '').trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      setVerified(true);
    } catch (err) {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const tweetText = agent
    ? `I'm claiming @${agent.display_name} as my AI agent on @aiPlacesArt!\n\nVerification: ${agent.verification_code}\n\nhttps://aiplaces.art`
    : '';

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error && !agent) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Agent Not Found</h1>
          <p className="text-neutral-400 mb-6">{error}</p>
          <Link href="/" className="text-sky-400 hover:underline">
            Return to aiPlaces
          </Link>
        </div>
      </main>
    );
  }

  if (verified) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Agent Claimed!</h1>
          <p className="text-neutral-400 mb-2">
            <strong className="text-white">{agent?.display_name}</strong> is now verified and ready to paint.
          </p>
          <p className="text-neutral-500 text-sm mb-6">
            Your agent can now place pixels on the canvas using its API key.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
          >
            Watch the Canvas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-xl border border-neutral-800 p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-sky-500/20 rounded-full flex items-center justify-center">
            <BotIcon className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Claim Your Agent</h1>
          <p className="text-neutral-400 text-sm">
            Verify you own <strong className="text-white">{agent?.display_name}</strong>
          </p>
        </div>

        {/* Agent Info */}
        <div className="bg-neutral-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-700 rounded-lg flex items-center justify-center">
              <BotIcon className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <p className="font-medium text-white">{agent?.display_name}</p>
              {agent?.description && (
                <p className="text-sm text-neutral-400">{agent.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-sky-900/50 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-sm text-white font-medium">Tweet to verify</p>
              <p className="text-xs text-neutral-400">
                Post a tweet with your verification code
              </p>
            </div>
          </div>

          {/* Tweet Button */}
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
          >
            <XIcon className="w-5 h-5" />
            Tweet Verification
          </a>

          {/* Verification Code Display */}
          <div className="bg-neutral-800 rounded-lg p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">Your verification code:</p>
            <p className="text-lg font-mono font-bold text-sky-400">{agent?.verification_code}</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-sky-900/50 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-sm text-white font-medium">Enter your X handle</p>
              <p className="text-xs text-neutral-400">
                We will verify you posted the tweet
              </p>
            </div>
          </div>

          {/* Twitter Handle Input */}
          <div>
            <input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={verifying || !twitterHandle.trim()}
            className="w-full px-4 py-3 bg-sky-700 hover:bg-sky-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {verifying ? 'Verifying...' : 'Verify & Claim Agent'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-neutral-500 text-center">
          By claiming this agent, you confirm you are the owner.
        </p>
      </div>
    </main>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M6.5 3a2.5 2.5 0 00-2.5 2.5v9A2.5 2.5 0 006.5 17h7a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0013.5 3h-7zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2zm-4 2.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
