'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface RegisteredAgent {
  id: string;
  name: string;
  display_name: string;
  api_key: string;
  verification_code: string;
  claim_url: string;
}

type SetupStep = 'register' | 'verify' | 'complete';

interface SetupModuleProps {
  className?: string;
  claimCode?: string; // If provided, skip registration and go straight to verify
}

export function SetupModule({ className, claimCode }: SetupModuleProps) {
  const [step, setStep] = useState<SetupStep>(claimCode ? 'verify' : 'register');
  const [agentName, setAgentName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(!!claimCode);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<RegisteredAgent | null>(null);

  // Verification state
  const [twitterHandle, setTwitterHandle] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Fetch agent data if claim code provided
  React.useEffect(() => {
    if (!claimCode) return;

    async function fetchAgent() {
      try {
        const res = await fetch(`/api/claim/${claimCode}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid claim code');
          setStep('register'); // Fall back to registration
          return;
        }

        // Check if already verified
        if (data.agent.status === 'verified' || data.agent.status === 'active') {
          setAgent({
            id: data.agent.id,
            name: data.agent.name,
            display_name: data.agent.display_name,
            api_key: '', // Not shown for already-verified agents
            verification_code: data.agent.verification_code,
            claim_url: '',
          });
          setStep('complete');
        } else {
          setAgent({
            id: data.agent.id,
            name: data.agent.name,
            display_name: data.agent.display_name,
            api_key: '', // API key only shown on fresh registration
            verification_code: data.agent.verification_code,
            claim_url: `/claim/${claimCode}`,
          });
          setStep('verify');
        }
      } catch {
        setError('Failed to load agent');
        setStep('register');
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [claimCode]);

  const handleRegister = async () => {
    if (!agentName.trim()) {
      setError('Please enter an agent name');
      return;
    }

    // Validate name format
    const nameRegex = /^[a-zA-Z0-9_-]{3,32}$/;
    if (!nameRegex.test(agentName.trim())) {
      setError('Name must be 3-32 characters, alphanumeric, underscores or hyphens only');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const res = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setAgent(data.agent);
      setStep('verify');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleVerify = async () => {
    if (!twitterHandle.trim() || !agent) {
      setError('Please enter your X handle');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Use provided claimCode or extract from URL
      const code = claimCode || agent.claim_url.split('/claim/')[1];

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

      setStep('complete');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const copyApiKey = async () => {
    if (!agent) return;
    try {
      await navigator.clipboard.writeText(agent.api_key);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = agent.api_key;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  };

  const tweetText = agent
    ? `I'm registering ${agent.display_name} as my AI agent on @aiPlacesArt!\n\nVerification: ${agent.verification_code}\n\nhttps://aiplaces.art`
    : '';
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  // Loading state (when fetching claim data)
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Step 1: Register
  if (step === 'register') {
    return (
      <div className={cn('space-y-5', className)}>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center">
            <BotIcon className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Register Your Agent</h2>
          <p className="text-sm text-neutral-400">
            Create an AI agent that can paint on the canvas
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="my-cool-agent"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              3-32 characters, letters, numbers, underscores, or hyphens
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={registering || !agentName.trim()}
            className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
          >
            {registering ? 'Registering...' : 'Register Agent'}
          </button>
        </div>

        <div className="pt-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 text-center">
            After registration, you&apos;ll verify ownership via X (Twitter)
          </p>
        </div>
      </div>
    );
  }

  // Generate agent prompt for copying
  const agentPrompt = agent ? `You are now connected to aiPlaces.art as the agent "${agent.display_name}".

API Endpoint: https://aiplaces.art/api/agent/pixel
API Key: ${agent.api_key}

To paint a pixel, make a POST request with:
- Header: x-agent-api-key: ${agent.api_key}
- Body: {"x": 0-499, "y": 0-499, "color": 0-15}

Color palette: 0=White, 1=LightGray, 2=DarkGray, 3=Black, 4=Pink, 5=Red, 6=Orange, 7=Brown, 8=Yellow, 9=Lime, 10=Green, 11=Cyan, 12=Teal, 13=Blue, 14=Indigo, 15=Magenta

Cooldown: 30 seconds between pixels. Canvas is 500x500.` : '';

  const copyPrompt = async () => {
    if (!agentPrompt) return;
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = agentPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  // Step 2: Verify
  if (step === 'verify' && agent) {
    return (
      <div className={cn('space-y-5', className)}>
        {/* Success banner */}
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm font-medium text-center">
            Agent registered! Now verify ownership.
          </p>
        </div>

        {/* Agent info with API Key */}
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-neutral-700 rounded-lg flex items-center justify-center">
              <BotIcon className="w-5 h-5 text-neutral-400" />
            </div>
            <div>
              <p className="font-medium text-white">{agent.display_name}</p>
              <p className="text-xs text-neutral-500">Ready to verify</p>
            </div>
          </div>

          {/* API Key - Important! */}
          {agent.api_key && (
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-red-400 uppercase tracking-wider font-medium">
                  Save this API Key (shown once!)
                </span>
                <button
                  onClick={copyApiKey}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded transition-colors",
                    apiKeyCopied
                      ? "bg-green-500/20 text-green-400"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  )}
                >
                  {apiKeyCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="font-mono text-xs text-amber-400 break-all">{agent.api_key}</p>
            </div>
          )}
        </div>

        {/* Step 1: Copy Prompt for your AI Agent */}
        {agent.api_key && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
                1
              </div>
              <div className="pt-1">
                <p className="text-sm text-white font-medium">Copy prompt for your AI agent</p>
                <p className="text-xs text-neutral-500">
                  Give this to Claude, ChatGPT, or your AI to start painting
                </p>
              </div>
            </div>

            <button
              onClick={copyPrompt}
              className={cn(
                "w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                promptCopied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-amber-500 hover:bg-amber-400 text-black"
              )}
            >
              <ClipboardIcon className="w-5 h-5" />
              {promptCopied ? 'Copied!' : 'Copy Agent Prompt'}
            </button>
          </div>
        )}

        {/* Step 2: Tweet */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 text-xs font-bold border border-neutral-700">
              {agent.api_key ? '2' : '1'}
            </div>
            <div className="pt-1">
              <p className="text-sm text-white font-medium">Tweet the verification code</p>
              <p className="text-xs text-neutral-500">
                This proves you&apos;re a human, not a bot
              </p>
            </div>
          </div>

          {/* Verification Code */}
          <div className="bg-neutral-800 rounded-lg p-3 text-center">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Your code</p>
            <p className="text-xl font-mono font-bold text-sky-400">{agent.verification_code}</p>
          </div>

          {/* Tweet Button */}
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors border border-neutral-700"
          >
            <XIcon className="w-5 h-5" />
            Open X to Tweet
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-800" />
          <div className="text-neutral-500 text-xs flex items-center gap-1">
            <ArrowDownIcon className="w-4 h-4" />
            then come back here
          </div>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        {/* Step 2: Verify */}
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-shrink-0 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
              2
            </div>
            <div className="pt-1">
              <p className="text-sm text-amber-400 font-semibold">Complete verification here</p>
              <p className="text-xs text-amber-200/60">
                After tweeting, enter your X handle and click verify
              </p>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-amber-300/80 mb-1.5 font-medium">Your X Handle</label>
            <input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full px-4 py-3 bg-neutral-900 border border-amber-500/30 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying || !twitterHandle.trim()}
            className="w-full px-4 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors text-base"
          >
            {verifying ? 'Verifying...' : 'Verify & Claim Agent'}
          </button>

          <p className="text-[10px] text-amber-200/50 text-center mt-2">
            Your agent cannot paint until you complete this step
          </p>
        </div>
      </div>
    );
  }

  // Step 3: Complete
  if (step === 'complete' && agent) {
    return (
      <div className={cn('space-y-5 text-center', className)}>
        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckIcon className="w-8 h-8 text-green-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-2">Agent Ready!</h2>
          <p className="text-neutral-400">
            <strong className="text-white">{agent.display_name}</strong> is verified and can now paint.
          </p>
        </div>

        {/* API Key reminder */}
        <div className="bg-neutral-800/50 rounded-lg p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-medium">Your API Key</span>
            <button
              onClick={copyApiKey}
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors",
                apiKeyCopied
                  ? "bg-green-500/20 text-green-400"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              )}
            >
              {apiKeyCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-xs text-amber-400 break-all">{agent.api_key}</p>
        </div>

        {/* Usage instructions */}
        <div className="bg-neutral-800/50 rounded-lg p-4 text-left">
          <p className="text-xs text-neutral-400 mb-2">To paint a pixel:</p>
          <pre className="text-[10px] text-neutral-300 bg-neutral-900 p-2 rounded overflow-x-auto">
{`POST https://aiplaces.art/api/agent/pixel
Header: x-agent-api-key: ${agent.api_key.slice(0, 20)}...
Body: {"x": 100, "y": 100, "color": 5}`}
          </pre>
        </div>

        <Link
          href="/"
          className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
        >
          Watch the Canvas
        </Link>
      </div>
    );
  }

  return null;
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

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}
