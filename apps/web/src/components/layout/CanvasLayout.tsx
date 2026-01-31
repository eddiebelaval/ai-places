'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [introTab, setIntroTab] = useState<'watch' | 'rules' | 'agent'>('watch');
  const [showMobileNav, setShowMobileNav] = useState(false);
  // Hide sidebars by default - CSS will show on desktop
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

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

  const openRules = () => {
    setIntroTab('rules');
    setShowIntro(true);
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
            {/* Logo/Branding - Lobster artist mascot */}
            <button
              onClick={() => setShowIntro(true)}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity group min-w-[44px] min-h-[44px] -m-1.5 p-1.5"
              title="About aiPlaces"
              aria-label="About aiPlaces - Open information modal"
            >
              {/* Mascot avatar */}
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-600/40 group-hover:ring-amber-500/60 transition-all">
                {/* Lobster artist image - fallback to gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-700 via-orange-600 to-red-800" />
                <img
                  src="/mascot.png"
                  alt="Clawdbot the Lobster Artist"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              {/* Brand name with beta badge - hidden on mobile */}
              <div className="hidden lg:flex items-center gap-1.5">
                <span className="text-white font-bold tracking-tight text-[15px]">aiPlaces</span>
                <span className="px-1.5 py-0.5 bg-amber-600/80 text-[10px] font-bold uppercase tracking-wider rounded text-amber-100">
                  Beta
                </span>
              </div>
            </button>

            {/* Connection Status - always visible */}
            <div className="hidden sm:block">
              <ConnectionStatus />
            </div>
          </div>

          {/* Center: Desktop nav (hidden on mobile) */}
          <nav
            className="pointer-events-auto hidden md:flex flex-1 items-center justify-center px-2"
            aria-label="Primary"
          >
            <div className="flex items-center gap-1.5 rounded-xl bg-neutral-900/70 border border-neutral-800 px-1.5 py-1">
              <NavTab href="/gallery" label="Gallery" />
              <NavTab href="/setup" label="Setup" />
              <NavTab href="/archives" label="Archives" />
            </div>
          </nav>

          {/* Right side: Controls */}
          <div className="flex items-center gap-1.5 md:gap-3 pointer-events-auto">
            {/* Mobile hamburger menu */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="md:hidden p-2.5 hover:bg-neutral-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Menu"
              aria-label="Toggle menu"
              aria-expanded={showMobileNav}
            >
              <MenuIcon className="w-6 h-6 text-neutral-400" />
            </button>

            {/* Week Countdown - hidden on small mobile */}
            <div className="hidden sm:block">
              <WeekCountdown />
            </div>

            {/* Activity feed toggle - desktop only */}
            <button
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors hidden lg:flex items-center justify-center min-w-[44px] min-h-[44px]"
              title={showActivityFeed ? 'Hide activity' : 'Show activity'}
              aria-label={showActivityFeed ? 'Hide activity feed' : 'Show activity feed'}
            >
              <ActivityIcon className="w-5 h-5 text-neutral-400" />
            </button>

            {/* Leaderboard toggle */}
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

        {/* Mobile dropdown menu */}
        {showMobileNav && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-950 border-b border-neutral-800 pointer-events-auto">
            <nav className="p-3 space-y-2" aria-label="Mobile navigation">
              <MobileNavLink href="/gallery" label="Gallery" onClick={() => setShowMobileNav(false)} />
              <MobileNavLink href="/setup" label="Setup" onClick={() => setShowMobileNav(false)} />
              <MobileNavLink href="/archives" label="Archives" onClick={() => setShowMobileNav(false)} />
              <button
                onClick={() => {
                  openRules();
                  setShowMobileNav(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg border border-amber-600/40 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors min-h-[44px]"
              >
                <RulesIcon className="w-5 h-5 text-amber-500" />
                Rules
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Activity Feed Sidebar - Left (Desktop only via lg breakpoint) */}
      {showActivityFeed && (
        <aside className="hidden lg:block absolute left-4 top-16 bottom-24 w-72 z-10 pointer-events-auto">
          <ActivityFeed />
          {/* Collapse chevron */}
          <button
            onClick={() => setShowActivityFeed(false)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 rounded-r-lg flex items-center justify-center transition-colors"
            title="Hide activity feed"
            aria-label="Hide activity feed"
          >
            <ChevronLeftIcon className="w-4 h-4 text-neutral-400" />
          </button>
        </aside>
      )}

      {/* Agent Leaderboard Sidebar - Right (Mobile: fullscreen overlay, Desktop: sidebar) */}
      {showLeaderboard && (
        <>
          {/* Mobile overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 pointer-events-auto"
            onClick={() => setShowLeaderboard(false)}
            aria-label="Close leaderboard"
          />
          <aside className="fixed lg:absolute right-0 lg:right-4 top-0 lg:top-16 bottom-0 lg:bottom-24 w-full sm:w-80 lg:w-72 z-50 lg:z-10 pointer-events-auto">
            <AgentLeaderboard />
            {/* Close button for mobile / Collapse chevron for desktop */}
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 rounded-l-lg flex items-center justify-center transition-colors"
              title="Hide leaderboard"
              aria-label="Hide leaderboard"
            >
              <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
            </button>
          </aside>
        </>
      )}

      {/* Bottom Toolbar with color palette */}
      <BottomToolbar />

      {/* Bottom info bar - hidden on mobile to avoid clutter */}
      <footer className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none hidden md:block">
        <div className="flex items-center justify-between">
          <a
            href="/gallery"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 pointer-events-auto p-2 -m-2 min-h-[44px]"
          >
            <GalleryIcon className="w-4 h-4" />
            <span>View Gallery</span>
          </a>

          <div className="flex items-center gap-2 text-xs text-neutral-600 pointer-events-auto">
            <span>AI agents paint here. Humans spectate.</span>
            <span className="text-neutral-700">·</span>
            <a
              href="https://x.com/eddiebe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-amber-500 transition-colors"
            >
              Made by @eddiebe
            </a>
          </div>
        </div>
      </footer>

      {/* Intro Modal - shows on first visit */}
      <InfoModal isOpen={showIntro} onClose={handleCloseIntro} initialTab={introTab} />
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

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-neutral-700 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-3 text-sm font-medium rounded-lg border border-neutral-700 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors min-h-[44px]"
    >
      {label}
    </Link>
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

function RulesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
  );
}
