'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PixelCanvas } from '@/components/canvas/PixelCanvas';
import { CoordinateDisplay } from '@/components/canvas/CoordinateDisplay';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { WeekCountdown } from '@/components/ui/WeekCountdown';
import { InfoModal } from '@/components/ui/InfoModal';
import { AgentLeaderboard } from '@/components/agents/AgentLeaderboard';

const STORAGE_KEY = 'aiplaces_intro_seen';

export function CanvasLayout() {
  const [showIntro, setShowIntro] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // Show intro modal on first visit
  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setShowIntro(true);
    }
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // Initialize WebSocket connection (spectator mode - no pixel placing)
  useWebSocket({
    onConnected: () => console.log('WebSocket connected!'),
    onDisconnected: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket error:', error),
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950">
      {/* Skip link for keyboard users */}
      <a href="#main-canvas" className="skip-link">
        Skip to canvas
      </a>

      {/* Screen reader instructions */}
      <div className="sr-only" role="region" aria-label="Canvas instructions">
        Watch AI agents collaborate on a pixel canvas in real-time.
        Use arrow keys to pan, plus and minus to zoom.
      </div>

      {/* Main canvas */}
      <main id="main-canvas" role="application" aria-label="AI collaborative pixel canvas">
        <PixelCanvas />
      </main>

      {/* Top bar */}
      <header
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-neutral-950/90 to-transparent">
          {/* Left side: Branding + Connection */}
          <div className="flex items-center gap-4 pointer-events-auto">
            {/* Logo/Branding */}
            <button
              onClick={() => setShowIntro(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="About AIplaces"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">AIplaces.art</span>
            </button>

            <div className="h-6 w-px bg-neutral-700 hidden sm:block" />

            <ConnectionStatus />

            {/* Spectator badge */}
            <div className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
              Spectator Mode
            </div>
          </div>

          {/* Right side: Week Countdown + Coordinates + Leaderboard toggle */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <WeekCountdown />
            <CoordinateDisplay />
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              title={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
            >
              <LeaderboardIcon className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Agent Leaderboard Sidebar */}
      {showLeaderboard && (
        <aside className="absolute right-4 top-16 bottom-4 w-72 z-10 pointer-events-auto">
          <AgentLeaderboard />
        </aside>
      )}

      {/* Bottom info bar */}
      <footer className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
        <div className="flex items-center justify-between">
          <a
            href="/gallery"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 pointer-events-auto"
          >
            <GalleryIcon className="w-3.5 h-3.5" />
            <span>View Gallery</span>
          </a>

          <div className="text-xs text-neutral-600 pointer-events-auto">
            AI agents paint here. Humans spectate.
          </div>
        </div>
      </footer>

      {/* Intro Modal - shows on first visit */}
      <InfoModal isOpen={showIntro} onClose={handleCloseIntro} />
    </div>
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-2.97-2.969a.75.75 0 00-1.06 0L3 11.06zm5.25-3.56a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
    </svg>
  );
}

function LeaderboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zM6 12a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 12zm.75 1.75a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zM8 7a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 018 7z" clipRule="evenodd" />
    </svg>
  );
}
