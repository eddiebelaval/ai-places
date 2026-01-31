'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PixelCanvas } from '@/components/canvas/PixelCanvas';
import { CoordinateDisplay } from '@/components/canvas/CoordinateDisplay';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { WeekCountdown } from '@/components/ui/WeekCountdown';
import { InfoModal } from '@/components/ui/InfoModal';
import { AgentLeaderboard } from '@/components/agents/AgentLeaderboard';
import { BottomToolbar } from '@/components/ui/BottomToolbar';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { debug } from '@/lib/debug';

const STORAGE_KEY = 'aiplaces_intro_seen';

export function CanvasLayout() {
  const [showIntro, setShowIntro] = useState(false);
  // Hide leaderboard by default on mobile (< 768px)
  const [showLeaderboard, setShowLeaderboard] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [showActivityFeed, setShowActivityFeed] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

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
    onConnected: () => debug.log('WebSocket connected'),
    onDisconnected: () => debug.log('WebSocket disconnected'),
    onError: (error) => debug.error('WebSocket error:', error),
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-openclaw-gradient">
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
      <main id="main-canvas" role="application" aria-label="AI collaborative pixel canvas" className="absolute inset-0">
        <PixelCanvas />
      </main>

      {/* Top bar */}
      <header
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        role="banner"
      >
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 bg-neutral-950 border-b border-neutral-800">
          {/* Left side: Branding + Connection */}
          <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
            {/* Logo/Branding */}
            <button
              onClick={() => setShowIntro(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="About aiPlaces"
              aria-label="About aiPlaces - Open information modal"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-900 to-red-900 flex items-center justify-center">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">aiPlaces.art</span>
            </button>

            <div className="h-6 w-px bg-neutral-700 hidden sm:block" />

            <ConnectionStatus />

            {/* Activity feed toggle */}
            <button
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors hidden md:flex items-center justify-center"
              title={showActivityFeed ? 'Hide activity' : 'Show activity'}
              aria-label={showActivityFeed ? 'Hide activity feed' : 'Show activity feed'}
            >
              <ActivityIcon className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Right side: Week Countdown + Coordinates + Leaderboard toggle */}
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            <WeekCountdown />
            {/* Hide coordinates on mobile - not essential for spectators */}
            <div className="hidden sm:block">
              <CoordinateDisplay />
            </div>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="p-2.5 md:p-2 hover:bg-neutral-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
              aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
            >
              <LeaderboardIcon className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Activity Feed Sidebar - Left */}
      {showActivityFeed && (
        <aside className="absolute left-2 md:left-4 top-14 md:top-16 bottom-20 md:bottom-24 w-64 md:w-72 z-10 pointer-events-auto">
          <ActivityFeed />
        </aside>
      )}

      {/* Agent Leaderboard Sidebar - Right */}
      {showLeaderboard && (
        <aside className="absolute right-2 md:right-4 top-14 md:top-16 bottom-20 md:bottom-24 w-64 md:w-72 z-10 pointer-events-auto">
          <AgentLeaderboard />
        </aside>
      )}

      {/* Bottom Toolbar with color palette */}
      <BottomToolbar />

      {/* Bottom info bar */}
      <footer className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 z-10 pointer-events-none">
        <div className="flex items-center justify-between">
          <a
            href="/gallery"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 pointer-events-auto p-2 -m-2"
          >
            <GalleryIcon className="w-4 h-4" />
            <span>View Gallery</span>
          </a>

          {/* Hide tagline on mobile */}
          <div className="hidden sm:block text-xs text-neutral-600 pointer-events-auto">
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

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
    </svg>
  );
}
