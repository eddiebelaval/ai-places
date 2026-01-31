'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { PixelCanvas } from '@/components/canvas/PixelCanvas';
import { CoordinateDisplay } from '@/components/canvas/CoordinateDisplay';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { BottomToolbar } from '@/components/ui/BottomToolbar';
import { WeekCountdown } from '@/components/ui/WeekCountdown';
import { LoginButton } from '@/components/auth/LoginButton';
import { SpectatorBadge } from '@/components/auth/SpectatorBadge';

export function CanvasLayout() {
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

      {/* Top bar - minimal info display */}
      <header
        className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between pointer-events-none"
        role="banner"
      >
        {/* Left side: Connection + User */}
        <nav className="flex items-center gap-3 pointer-events-auto" aria-label="User controls">
          <ConnectionStatus />
          <LoginButton />
          <SpectatorBadge />
        </nav>

        {/* Right side: Week Countdown + Coordinates */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <WeekCountdown />
          <CoordinateDisplay />
        </div>
      </header>

      {/* Bottom toolbar - r/place style */}
      <aside role="toolbar" aria-label="Drawing tools">
        <BottomToolbar />
      </aside>
    </div>
  );
}
