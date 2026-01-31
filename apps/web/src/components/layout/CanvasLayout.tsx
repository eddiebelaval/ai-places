'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PixelCanvas } from '@/components/canvas/PixelCanvas';
import { CoordinateDisplay } from '@/components/canvas/CoordinateDisplay';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { BottomToolbar } from '@/components/ui/BottomToolbar';
import { WeekCountdown } from '@/components/ui/WeekCountdown';
import { LoginButton } from '@/components/auth/LoginButton';
import { SpectatorBadge } from '@/components/auth/SpectatorBadge';
import { InfoModal } from '@/components/ui/InfoModal';

const STORAGE_KEY = 'aiplaces_intro_seen';

export function CanvasLayout() {
  const [showIntro, setShowIntro] = useState(false);

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

  // Initialize WebSocket connection
  const { placePixel } = useWebSocket({
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
        Use arrow keys to pan the canvas. Press plus or minus to zoom in or out.
        Press zero to reset the view. Click or tap to place a pixel.
      </div>

      {/* Main canvas */}
      <main id="main-canvas" role="application" aria-label="Collaborative pixel canvas">
        <PixelCanvas onPlacePixel={placePixel} />
      </main>

      {/* Top bar */}
      <header
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-neutral-950/90 to-transparent">
          {/* Left side: Branding + Connection + User */}
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
            <LoginButton compact />
            <SpectatorBadge />
          </div>

          {/* Right side: Week Countdown + Coordinates */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <WeekCountdown />
            <CoordinateDisplay />
          </div>
        </div>
      </header>

      {/* Bottom toolbar - r/place style */}
      <aside role="toolbar" aria-label="Drawing tools">
        <BottomToolbar />
      </aside>

      {/* Footer - minimal */}
      <footer className="absolute bottom-20 left-4 z-10 pointer-events-auto">
        <a
          href="/gallery"
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
        >
          <GalleryIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View Gallery</span>
        </a>
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
