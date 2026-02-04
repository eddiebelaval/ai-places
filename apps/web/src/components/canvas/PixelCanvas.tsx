'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useUIStore } from '@/stores/ui-store';
import { useCanvasRenderer } from '@/hooks/useCanvasRenderer';
import { usePanZoom } from '@/hooks/usePanZoom';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ColorIndex } from '@aiplaces/shared';
import { cn } from '@/lib/utils';
import { debug } from '@/lib/debug';

interface PixelCanvasProps {
  /** Optional callback for pixel placement (only for authenticated non-spectator users) */
  onPlacePixel?: (x: number, y: number, color: ColorIndex) => void;
  /** Force debug overlay regardless of URL param */
  debugOverlay?: boolean;
}

export function PixelCanvas({ onPlacePixel, debugOverlay }: PixelCanvasProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDebug, setIsDebug] = useState(Boolean(debugOverlay));
  const [lastInputEvent, setLastInputEvent] = useState<string>('none');
  const [lastInputPos, setLastInputPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (debugOverlay) {
      setIsDebug(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setIsDebug(params.get('debug') === '1');
  }, [debugOverlay]);

  const { colorIndices, updatePixel, isLoading, error: canvasError } = useCanvasStore();
  const {
    selectedColor,
    setCoordinates,
    setHoveredPixel,
    setCooldown,
    cooldownEnd,
  } = useUIStore();

  const { canvasRef, renderInitialState, queuePixelUpdate } = useCanvasRenderer({
    onReady: () => debug.log('Canvas renderer ready'),
  });

  const { viewport, getCanvasCoords, isDragging } = usePanZoom({
    containerRef,
    onCoordinateChange: (x, y) => {
      setCoordinates(x, y);
      setHoveredPixel({ x, y });
    },
  });

  // Render initial canvas state when color indices are available
  useEffect(() => {
    if (colorIndices) {
      renderInitialState(colorIndices);
    }
  }, [colorIndices, renderInitialState]);

  // Note: Canvas data is loaded from WebSocket server via useWebSocket hook
  // The server sends 'canvas_state' message on connect which triggers initializeCanvas

  const placePixelAt = useCallback(
    (clientX: number, clientY: number) => {
      if (isDragging) return;
      if (cooldownEnd && Date.now() < cooldownEnd) return;

      const coords = getCanvasCoords(clientX, clientY);

      // Update local state immediately (optimistic)
      updatePixel(coords.x, coords.y, selectedColor);
      queuePixelUpdate({ x: coords.x, y: coords.y, color: selectedColor });

      // Send to server via WebSocket
      if (onPlacePixel) {
        onPlacePixel(coords.x, coords.y, selectedColor);
      }

      // Set cooldown (5 seconds for demo)
      setCooldown(Date.now() + 5000);

      debug.log(`Placed pixel at (${coords.x}, ${coords.y}) with color ${selectedColor}`);
    },
    [
      isDragging,
      cooldownEnd,
      getCanvasCoords,
      selectedColor,
      updatePixel,
      queuePixelUpdate,
      setCooldown,
      onPlacePixel,
    ]
  );

  // Handle pixel placement (mouse)
  const handleClick = useCallback((e: React.MouseEvent) => {
    placePixelAt(e.clientX, e.clientY);
  }, [placePixelAt]);

  // Debug: capture raw input events on the canvas container
  useEffect(() => {
    if (!isDebug) return;
    const container = containerRef.current;
    if (!container) return;

    const updatePos = (x: number, y: number) => setLastInputPos({ x, y });

    const onTouchStart = (e: TouchEvent) => {
      setLastInputEvent('touchstart');
      if (e.touches[0]) updatePos(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      setLastInputEvent('touchmove');
      if (e.touches[0]) updatePos(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      setLastInputEvent('touchend');
      if (e.changedTouches[0]) updatePos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      setLastInputEvent(`pointerdown (${e.pointerType})`);
      updatePos(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      setLastInputEvent(`pointermove (${e.pointerType})`);
      updatePos(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      setLastInputEvent(`pointerup (${e.pointerType})`);
      updatePos(e.clientX, e.clientY);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerup', onPointerUp, { passive: true });
    container.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDebug]);

  // Handle pixel placement (touch/pointer tap)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCanvasTap = (event: Event) => {
      const customEvent = event as CustomEvent<{ clientX: number; clientY: number }>;
      if (!customEvent.detail) return;
      placePixelAt(customEvent.detail.clientX, customEvent.detail.clientY);
    };

    container.addEventListener('canvasTap', handleCanvasTap as EventListener);
    return () => {
      container.removeEventListener('canvasTap', handleCanvasTap as EventListener);
    };
  }, [placePixelAt]);

  // Canvas transform style
  const transformStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: 'center center',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden canvas-container',
        isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
      )}
      onClick={handleClick}
      tabIndex={0}
      role="img"
      aria-label={`Pixel canvas, ${CANVAS_WIDTH} by ${CANVAS_HEIGHT} pixels. Use arrow keys to pan, plus and minus to zoom, zero to reset view.`}
    >
      {isDebug && (
        <div className="fixed top-16 left-2 z-[1000] pointer-events-none rounded-md border border-red-500/60 bg-black/80 px-2 py-1 text-[11px] text-white">
          <div className="text-[10px] uppercase tracking-wide text-red-300">Pan Debug</div>
          <div>viewport: {Math.round(viewport.x)}, {Math.round(viewport.y)} @ {viewport.zoom.toFixed(2)}</div>
          <div>last input: {lastInputEvent}</div>
          <div>pos: {lastInputPos ? `${Math.round(lastInputPos.x)}, ${Math.round(lastInputPos.y)}` : '—'}</div>
        </div>
      )}
      {/* Error state */}
      {canvasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/90 z-50">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-red-400 font-medium">Canvas unavailable</p>
              <p className="text-neutral-500 text-sm mt-1">{canvasError}</p>
              <p className="text-neutral-600 text-xs mt-2">Waiting for reconnection...</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !canvasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-neutral-400">Loading canvas...</span>
          </div>
        </div>
      )}

      {/* Canvas container with transforms */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={transformStyle}
      >
        {/* Rounded canvas frame */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] pointer-events-none z-10" />
          <canvas
            ref={canvasRef}
            className="image-rendering-pixelated block"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              imageRendering: 'pixelated',
            }}
          />
        </div>
      </div>

      {/* Grid overlay at high zoom */}
      {viewport.zoom >= 10 && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={transformStyle}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: '1px 1px',
            }}
          />
        </div>
      )}
    </div>
  );
}
