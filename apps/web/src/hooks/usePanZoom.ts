'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZOOM } from '@aiplaces/shared';

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

interface UsePanZoomOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  onCoordinateChange?: (x: number, y: number) => void;
}

/**
 * Convert screen coordinates to canvas coordinates
 */
function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const canvasX = Math.floor((screenX - centerX - viewport.x) / viewport.zoom);
  const canvasY = Math.floor((screenY - centerY - viewport.y) / viewport.zoom);

  return {
    x: Math.max(0, Math.min(CANVAS_WIDTH - 1, canvasX)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - 1, canvasY)),
  };
}

/**
 * Hook for pan and zoom navigation
 *
 * IMPORTANT: Uses refs for values accessed in event handlers to avoid
 * stale closure issues that break touch gestures.
 */
export function usePanZoom({ containerRef, onCoordinateChange }: UsePanZoomOptions) {
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: ZOOM.DEFAULT,
    targetX: 0,
    targetY: 0,
    targetZoom: ZOOM.DEFAULT,
  });

  // Refs for values that change frequently but are needed in event handlers
  // This prevents stale closures and avoids re-registering event listeners
  const viewportRef = useRef(viewport);
  const onCoordinateChangeRef = useRef(onCoordinateChange);

  // Keep refs in sync with state/props
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    onCoordinateChangeRef.current = onCoordinateChange;
  }, [onCoordinateChange]);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Touch gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchingRef = useRef(false);
  const initialPinchDistRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(ZOOM.DEFAULT);
  const touchMovedRef = useRef(false);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setViewport((prev) => {
        const easing = 0.15;
        const dx = prev.targetX - prev.x;
        const dy = prev.targetY - prev.y;
        const dz = prev.targetZoom - prev.zoom;

        // Skip if close enough
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) < 0.01) {
          return prev;
        }

        return {
          ...prev,
          x: prev.x + dx * easing,
          y: prev.y + dy * easing,
          zoom: prev.zoom + dz * easing,
        };
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Mouse wheel zoom - stable reference, uses viewportRef
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const pointX = e.clientX - rect.left;
      const pointY = e.clientY - rect.top;

      setViewport((prev) => {
        const zoomDelta = -e.deltaY * 0.002;
        const newZoom = Math.max(
          ZOOM.MIN,
          Math.min(ZOOM.MAX, prev.targetZoom * (1 + zoomDelta))
        );

        // Zoom centered on mouse position
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const relX = pointX - centerX;
        const relY = pointY - centerY;
        const scale = newZoom / prev.targetZoom;

        return {
          ...prev,
          targetX: prev.targetX * scale - relX * (scale - 1),
          targetY: prev.targetY * scale - relY * (scale - 1),
          targetZoom: newZoom,
        };
      });
    },
    [containerRef]
  );

  // Mouse drag pan
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Update coordinate display using ref
      if (onCoordinateChangeRef.current) {
        const coords = screenToCanvas(
          e.clientX - rect.left,
          e.clientY - rect.top,
          viewportRef.current,
          rect.width,
          rect.height
        );
        onCoordinateChangeRef.current(coords.x, coords.y);
      }

      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      setViewport((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
        targetX: prev.targetX + dx,
        targetY: prev.targetY + dy,
      }));
    },
    [containerRef]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Helper: Calculate distance between two touch points
  const getPinchDistance = (touches: TouchList): number => {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
  };

  // Helper: Get midpoint of two touches
  const getPinchMidpoint = (touches: TouchList, rect: DOMRect) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
    };
  };

  // Touch start handler - stable reference, uses refs
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Prevent default to stop browser gestures
      e.preventDefault();

      const touches = e.touches;
      isTouchingRef.current = true;
      touchMovedRef.current = false;

      if (touches.length === 1) {
        // Single finger - prepare for pan or tap
        const touch = touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      } else if (touches.length === 2) {
        // Two fingers - prepare for pinch zoom
        initialPinchDistRef.current = getPinchDistance(touches);
        initialZoomRef.current = viewportRef.current.targetZoom;

        // Store midpoint for pan during pinch
        const rect = container.getBoundingClientRect();
        const mid = getPinchMidpoint(touches, rect);
        lastTouchRef.current = { x: mid.x + rect.left, y: mid.y + rect.top };
      }
    },
    [containerRef]
  );

  // Touch move handler - stable reference, uses refs
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container || !isTouchingRef.current) return;

      e.preventDefault();

      const touches = e.touches;
      const rect = container.getBoundingClientRect();

      if (touches.length === 1 && lastTouchRef.current) {
        // Single finger pan
        const touch = touches[0];
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;

        // Mark as moved if significant movement
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          touchMovedRef.current = true;
        }

        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

        setViewport((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
          targetX: prev.targetX + dx,
          targetY: prev.targetY + dy,
        }));

        // Update coordinate display using ref
        if (onCoordinateChangeRef.current) {
          const coords = screenToCanvas(
            touch.clientX - rect.left,
            touch.clientY - rect.top,
            viewportRef.current,
            rect.width,
            rect.height
          );
          onCoordinateChangeRef.current(coords.x, coords.y);
        }
      } else if (touches.length === 2 && initialPinchDistRef.current > 0) {
        // Two finger pinch zoom
        touchMovedRef.current = true;
        const currentDist = getPinchDistance(touches);
        const scale = currentDist / initialPinchDistRef.current;
        const newZoom = Math.max(
          ZOOM.MIN,
          Math.min(ZOOM.MAX, initialZoomRef.current * scale)
        );

        // Get pinch midpoint for zoom centering
        const midpoint = getPinchMidpoint(touches, rect);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const relX = midpoint.x - centerX;
        const relY = midpoint.y - centerY;

        setViewport((prev) => {
          const zoomScale = newZoom / prev.targetZoom;
          return {
            ...prev,
            targetX: prev.targetX * zoomScale - relX * (zoomScale - 1),
            targetY: prev.targetY * zoomScale - relY * (zoomScale - 1),
            targetZoom: newZoom,
          };
        });
      }
    },
    [containerRef]
  );

  // Touch end handler - stable reference, uses refs
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Check for tap (short touch without significant movement)
      if (
        touchStartRef.current &&
        !touchMovedRef.current &&
        e.changedTouches.length === 1
      ) {
        const touchDuration = Date.now() - touchStartRef.current.time;

        // Tap detection: short duration, minimal movement
        if (touchDuration < 300) {
          const touch = e.changedTouches[0];
          const rect = container.getBoundingClientRect();

          // Update coordinate display for tap location using ref
          if (onCoordinateChangeRef.current) {
            const coords = screenToCanvas(
              touch.clientX - rect.left,
              touch.clientY - rect.top,
              viewportRef.current,
              rect.width,
              rect.height
            );
            onCoordinateChangeRef.current(coords.x, coords.y);
          }

          // Dispatch a custom tap event that the canvas can listen for
          const tapEvent = new CustomEvent('canvasTap', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
            },
          });
          container.dispatchEvent(tapEvent);
        }
      }

      // Reset touch state
      if (e.touches.length === 0) {
        isTouchingRef.current = false;
        touchStartRef.current = null;
        lastTouchRef.current = null;
        initialPinchDistRef.current = 0;
        touchMovedRef.current = false;
      } else if (e.touches.length === 1) {
        // Went from 2 fingers to 1 - reset for single finger pan
        const touch = e.touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        initialPinchDistRef.current = 0;
      }
    },
    [containerRef]
  );

  // Center on coordinates
  const centerOn = useCallback(
    (canvasX: number, canvasY: number, zoom?: number) => {
      setViewport((prev) => {
        const targetZoom = zoom ?? prev.targetZoom;
        return {
          ...prev,
          targetX: -canvasX * targetZoom,
          targetY: -canvasY * targetZoom,
          targetZoom,
        };
      });
    },
    []
  );

  // Toggle zoom level
  const toggleZoom = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      targetZoom: prev.targetZoom < ZOOM.DRAW ? ZOOM.DRAW : ZOOM.DEFAULT,
    }));
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      targetZoom: Math.min(ZOOM.MAX, prev.targetZoom * 1.5),
    }));
  }, []);

  // Zoom out
  const zoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      targetZoom: Math.max(ZOOM.MIN, prev.targetZoom / 1.5),
    }));
  }, []);

  // Reset view to center
  const resetView = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      targetX: 0,
      targetY: 0,
      targetZoom: ZOOM.DEFAULT,
    }));
  }, []);

  // Pan by pixels
  const pan = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      targetX: prev.targetX + dx,
      targetY: prev.targetY + dy,
    }));
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Only handle if canvas container is focused
      if (!container.contains(document.activeElement) && document.activeElement !== container) {
        return;
      }

      const panStep = 50; // Pixels to pan per keypress

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          pan(0, panStep);
          break;
        case 'ArrowDown':
          e.preventDefault();
          pan(0, -panStep);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          pan(panStep, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          pan(-panStep, 0);
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetView();
          break;
      }
    },
    [containerRef, pan, zoomIn, zoomOut, resetView]
  );

  // Get canvas coordinates from screen position
  const getCanvasCoords = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      return screenToCanvas(
        screenX - rect.left,
        screenY - rect.top,
        viewportRef.current,
        rect.width,
        rect.height
      );
    },
    [containerRef]
  );

  // Set up event listeners - now with stable handler references
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse events
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    // Touch events - passive: false is critical to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    viewport,
    centerOn,
    toggleZoom,
    zoomIn,
    zoomOut,
    resetView,
    pan,
    getCanvasCoords,
    isDragging: isDraggingRef.current,
    isTouching: isTouchingRef.current,
  };
}
