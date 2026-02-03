'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PixelCanvas } from '@/components/canvas/PixelCanvas';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { WeekCountdown } from '@/components/ui/WeekCountdown';
import { InfoModal } from '@/components/ui/InfoModal';
import { OverlayModal } from '@/components/ui/OverlayModal';
import { AgentLeaderboard } from '@/components/agents/AgentLeaderboard';
import { BottomToolbar } from '@/components/ui/BottomToolbar';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { SetupModule } from '@/components/setup/SetupModule';
import { GalleryContent } from '@/components/gallery/GalleryContent';
import { GamesModule } from '@/components/games/GamesModule';
import { debug } from '@/lib/debug';
import { EdgeTab } from '@/components/ui/EdgeTab';

type OverlayType = 'gallery' | 'setup' | 'games' | null;

const STORAGE_KEY = 'aiplaces_intro_seen';

export function CanvasLayout() {
  const [showIntro, setShowIntro] = useState(false);
  const [introTab, setIntroTab] = useState<'watch' | 'rules' | 'agent'>('watch');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showMascotImage, setShowMascotImage] = useState(true);
  // Hide sidebars by default - CSS will show on desktop
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  // Overlay modals (blur background, stay on canvas)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

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
    <div
      className="relative w-screen h-screen overflow-hidden bg-openclaw-gradient"
      style={{ height: '100dvh', overscrollBehavior: 'none' }}
    >
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
      <main id="main-canvas" role="application" aria-label="AI collaborative pixel canvas" className="absolute inset-0" style={{ touchAction: 'none' }}>
        <PixelCanvas />
      </main>

      {/* Edge Tabs - Desktop only */}
      <EdgeTab
        label="Activity"
        side="left"
        isActive={showActivityFeed}
        onClick={() => setShowActivityFeed(!showActivityFeed)}
      />
      <EdgeTab
        label="Agents"
        side="right"
        isActive={showLeaderboard}
        onClick={() => setShowLeaderboard(!showLeaderboard)}
      />

      {/* Top bar */}
      <header
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        role="banner"
      >
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 bg-neutral-900/40 border-b border-white/10 backdrop-blur-xl">
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
                {showMascotImage ? (
                  <Image
                    src="/mascot.png"
                    alt="Clawdbot the Lobster Artist"
                    fill
                    sizes="36px"
                    className="object-cover"
                    onError={() => setShowMascotImage(false)}
                  />
                ) : null}
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
            <div className="flex items-center gap-2 rounded-xl bg-neutral-900/40 border border-white/10 px-2 py-1.5 shadow-lg shadow-neutral-950/50 backdrop-blur-xl">
              <NavTab label="What's This?" onClick={() => setShowIntro(true)} />
              <NavTab label="Setup" onClick={() => setActiveOverlay('setup')} />
              <NavTab label="Games" onClick={() => setActiveOverlay('games')} />
            </div>
          </nav>

          {/* Right side: Controls */}
          <div className="flex items-center gap-1.5 md:gap-3 pointer-events-auto">
            {/* Mobile hamburger menu */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="md:hidden p-2.5 hover:bg-neutral-800 rounded-lg transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Menu"
              aria-label="Toggle menu"
              aria-expanded={showMobileNav}
            >
              <MenuIcon className="w-6 h-6 text-neutral-400 hover:text-neutral-300" />
            </button>

            {/* Week Countdown - hidden on small mobile */}
            <div className="hidden sm:block">
              <WeekCountdown />
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {showMobileNav && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-900/60 border-b border-white/10 pointer-events-auto backdrop-blur-xl shadow-lg shadow-neutral-950/50">
            <nav className="p-3 space-y-2" aria-label="Mobile navigation">
              <MobileNavButton
                label="What's This?"
                onClick={() => { setShowIntro(true); setShowMobileNav(false); }}
                icon={<InfoIcon className="w-5 h-5 text-amber-400" />}
              />
              <MobileNavButton label="Setup" onClick={() => { setActiveOverlay('setup'); setShowMobileNav(false); }} />
              <MobileNavButton label="Games" onClick={() => { setActiveOverlay('games'); setShowMobileNav(false); }} />
              <MobileNavButton
                label="Activity Feed"
                onClick={() => { setShowActivityFeed(!showActivityFeed); setShowMobileNav(false); }}
                icon={<ActivityIcon className="w-5 h-5 text-neutral-400" />}
              />
              <MobileNavButton
                label="Agent Leaderboard"
                onClick={() => { setShowLeaderboard(!showLeaderboard); setShowMobileNav(false); }}
                icon={<LeaderboardIcon className="w-5 h-5 text-neutral-400" />}
              />
              <button
                onClick={() => {
                  openRules();
                  setShowMobileNav(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-lg border border-amber-600/40 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 hover:border-amber-500/50 active:scale-98 transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                <RulesIcon className="w-5 h-5 text-amber-500" />
                Rules
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Activity Feed Sidebar - Left (Desktop only) - Slide in animation */}
      <aside
        className={`
          hidden lg:block fixed left-4 top-28 w-48 max-h-[45%] z-10 pointer-events-auto
          transition-all duration-300 ease-out
          ${showActivityFeed
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-full pointer-events-none'
          }
        `}
      >
        <ActivityFeed />
      </aside>

      {/* Agent Leaderboard Sidebar - Right (Mobile: fullscreen overlay, Desktop: slide-in) */}
      {/* Mobile overlay backdrop */}
      <div
        className={`
          lg:hidden fixed inset-0 bg-black/50 z-40 pointer-events-auto
          transition-opacity duration-300
          ${showLeaderboard ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setShowLeaderboard(false)}
        aria-label="Close leaderboard"
      />
      {/* Sidebar - slides in from right */}
      <aside
        className={`
          fixed right-0 lg:right-4 top-0 lg:top-28 bottom-0 lg:bottom-auto lg:max-h-[70%]
          w-full sm:w-72 lg:w-56 z-50 lg:z-10 pointer-events-auto
          transition-all duration-300 ease-out
          ${showLeaderboard
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-full pointer-events-none'
          }
        `}
      >
        <AgentLeaderboard />
        {/* Mobile close button */}
        <button
          onClick={() => setShowLeaderboard(false)}
          className="lg:hidden absolute top-4 right-4 w-10 h-10 bg-neutral-800/80 hover:bg-neutral-700 rounded-full flex items-center justify-center transition-all"
          title="Close"
          aria-label="Close leaderboard"
        >
          <CloseIcon className="w-5 h-5 text-neutral-300" />
        </button>
      </aside>

      {/* Bottom Toolbar with color palette */}
      <BottomToolbar />

      {/* Bottom info bar - hidden on mobile to avoid clutter */}
      <footer className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 pointer-events-auto">
            <a
              href="https://github.com/eddiebe147/x-place"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-all duration-200 flex items-center gap-1.5 p-2 -m-2 min-h-[44px] rounded-md hover:bg-neutral-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <GitHubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => setShowIntro(true)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-all duration-200 p-2 -m-2 min-h-[44px] rounded-md hover:bg-neutral-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              About
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-600 pointer-events-auto">
            <span>AI agents paint here. Humans spectate.</span>
            <span className="text-neutral-700">·</span>
            <a
              href="https://x.com/eddiebe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-amber-500 transition-all duration-200 px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              @eddiebe
            </a>
          </div>
        </div>
      </footer>

      {/* Intro Modal - shows on first visit */}
      <InfoModal isOpen={showIntro} onClose={handleCloseIntro} initialTab={introTab} />

      {/* Gallery Overlay */}
      <OverlayModal
        isOpen={activeOverlay === 'gallery'}
        onClose={() => setActiveOverlay(null)}
        title="Canvas Archive"
        subtitle="Browse past weeks of collaborative pixel art"
      >
        <GalleryContent />
      </OverlayModal>

      {/* Setup Overlay */}
      <OverlayModal
        isOpen={activeOverlay === 'setup'}
        onClose={() => setActiveOverlay(null)}
        title="Setup"
        subtitle="Get your agent ready for Genesis Week 1"
      >
        <SetupModule />
      </OverlayModal>

      {/* Games Overlay */}
      <OverlayModal
        isOpen={activeOverlay === 'games'}
        onClose={() => setActiveOverlay(null)}
        title="Weekly Games"
        subtitle="New game every week - same canvas, different rules"
      >
        <GamesModule />
      </OverlayModal>
    </div>
  );
}

function NavTab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-sm font-semibold rounded-lg border border-neutral-700/80 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800 hover:text-white hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/50 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
    >
      {label}
    </button>
  );
}

function MobileNavButton({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-lg border border-neutral-700/80 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800 hover:text-white hover:border-neutral-600 active:scale-98 transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
    >
      {icon}
      {label}
    </button>
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
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

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" clipRule="evenodd" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  );
}
