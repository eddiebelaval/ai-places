'use client';

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
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
 * Hook for pan and zoom navigation with proper mobile touch support.
 *
 * CRITICAL: Uses native event listeners with { passive: false } attached
 * directly to the DOM element. This bypasses React's event delegation
 * system which makes touch events passive by default on mobile Safari.
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

  // ALL REFS - to avoid stale closures in event handlers
  // Event handlers are attached once and never re-attached, so they must
  // access current values via refs, not via closure over state.
  const viewportRef = useRef(viewport);
  const onCoordinateChangeRef = useRef(onCoordinateChange);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Touch state refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchingRef = useRef(false);
  const initialPinchDistRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(ZOOM.DEFAULT);
  const touchMovedRef = useRef(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Track which event system started the gesture to prevent double-processing
  const activeEventSystemRef = useRef<'touch' | 'pointer' | null>(null);
  const touchStartedInsideRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  useEffect(() => { onCoordinateChangeRef.current = onCoordinateChange; }, [onCoordinateChange]);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setViewport((prev) => {
        const easing = 0.15;
        const dx = prev.targetX - prev.x;
        const dy = prev.targetY - prev.y;
        const dz = prev.targetZoom - prev.zoom;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) < 0.01) return prev;
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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Utility functions (no dependencies, safe to use anywhere)
  const getPinchDistance = (t1: Touch, t2: Touch): number => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const dispatchCanvasTap = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (onCoordinateChangeRef.current) {
      const coords = screenToCanvas(
        clientX - rect.left,
        clientY - rect.top,
        viewportRef.current,
        rect.width,
        rect.height
      );
      onCoordinateChangeRef.current(coords.x, coords.y);
    }

    container.dispatchEvent(new CustomEvent('canvasTap', {
      detail: { clientX, clientY },
    }));
  }, [containerRef]);

  // ============================================================
  // NATIVE EVENT HANDLERS - These access state via refs only!
  // ============================================================

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // CRITICAL: Must call preventDefault to stop browser scroll/zoom
    if (e.cancelable) e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    // Avoid double-handling if a touch sequence is already active
    if (activeEventSystemRef.current === 'touch' && isTouchingRef.current) return;

    // If pointer events already started a gesture, don't interfere
    if (activeEventSystemRef.current === 'pointer') return;

    activeEventSystemRef.current = 'touch';
    isTouchingRef.current = true;
    touchMovedRef.current = false;
    touchStartedInsideRef.current = true;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      initialPinchDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
      initialZoomRef.current = viewportRef.current.targetZoom;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      lastTouchRef.current = { x: midX, y: midY };
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // CRITICAL: Must call preventDefault to stop browser scroll/zoom
    if (e.cancelable) e.preventDefault();

    const container = containerRef.current;
    if (!container || !isTouchingRef.current) return;

    // Skip if pointer events are handling this gesture
    if (activeEventSystemRef.current !== 'touch') return;

    const rect = container.getBoundingClientRect();

    if (e.touches.length === 1 && lastTouchRef.current) {
      // Single finger pan
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
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

      // Update coordinate display
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
    } else if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
      // Two finger pinch zoom
      touchMovedRef.current = true;
      const currentDist = getPinchDistance(e.touches[0], e.touches[1]);
      const scale = currentDist / initialPinchDistRef.current;
      const newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, initialZoomRef.current * scale));

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const relX = midX - centerX;
      const relY = midY - centerY;

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
  }, [containerRef]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Detect tap (short touch without movement)
    if (touchStartRef.current && !touchMovedRef.current && e.changedTouches.length === 1) {
      const touchDuration = Date.now() - touchStartRef.current.time;
      if (touchDuration < 300) {
        const touch = e.changedTouches[0];
        dispatchCanvasTap(touch.clientX, touch.clientY);
      }
    }

    // Reset touch state
    if (e.touches.length === 0) {
      isTouchingRef.current = false;
      touchStartRef.current = null;
      lastTouchRef.current = null;
      initialPinchDistRef.current = 0;
      touchMovedRef.current = false;
      activeEventSystemRef.current = null; // Release so either system can start next gesture
      touchStartedInsideRef.current = false;
    } else if (e.touches.length === 1) {
      // Went from 2 fingers to 1
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPinchDistRef.current = 0;
    }
  }, [containerRef, dispatchCanvasTap]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Only handle pen input via PointerEvents on touch devices.
    if (e.pointerType !== 'pen') return;
    if (e.cancelable) e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    // If touch events already started a gesture, don't interfere
    if (activeEventSystemRef.current === 'touch') return;

    activeEventSystemRef.current = 'pointer';

    if (container.setPointerCapture) {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors (e.g. iOS Safari quirks)
      }
    }

    isTouchingRef.current = true;
    touchMovedRef.current = false;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    } else if (activePointersRef.current.size === 2) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      touchMovedRef.current = true;
      initialPinchDistRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      initialZoomRef.current = viewportRef.current.targetZoom;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      lastTouchRef.current = { x: midX, y: midY };
    }
  }, [containerRef]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (e.pointerType !== 'pen') return;
    if (!activePointersRef.current.has(e.pointerId)) return;
    if (e.cancelable) e.preventDefault();

    const container = containerRef.current;
    if (!container || !isTouchingRef.current) return;

    // Skip if touch events are handling this gesture
    if (activeEventSystemRef.current !== 'pointer') return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const rect = container.getBoundingClientRect();
    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length === 1 && lastTouchRef.current) {
      const point = pointers[0];
      const dx = point.x - lastTouchRef.current.x;
      const dy = point.y - lastTouchRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        touchMovedRef.current = true;
      }

      lastTouchRef.current = { x: point.x, y: point.y };

      setViewport((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
        targetX: prev.targetX + dx,
        targetY: prev.targetY + dy,
      }));

      if (onCoordinateChangeRef.current) {
        const coords = screenToCanvas(
          point.x - rect.left,
          point.y - rect.top,
          viewportRef.current,
          rect.width,
          rect.height
        );
        onCoordinateChangeRef.current(coords.x, coords.y);
      }
    } else if (pointers.length === 2 && initialPinchDistRef.current > 0) {
      touchMovedRef.current = true;
      const [p1, p2] = pointers;
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scale = currentDist / initialPinchDistRef.current;
      const newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, initialZoomRef.current * scale));

      const midX = (p1.x + p2.x) / 2 - rect.left;
      const midY = (p1.y + p2.y) / 2 - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const relX = midX - centerX;
      const relY = midY - centerY;

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
  }, [containerRef]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (e.pointerType !== 'pen') return;
    if (!activePointersRef.current.has(e.pointerId)) return;
    if (e.cancelable) e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    if (container.hasPointerCapture?.(e.pointerId)) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore release errors
      }
    }

    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size === 0) {
      if (touchStartRef.current && !touchMovedRef.current) {
        const touchDuration = Date.now() - touchStartRef.current.time;
        if (touchDuration < 300) {
          dispatchCanvasTap(e.clientX, e.clientY);
        }
      }

      isTouchingRef.current = false;
      touchStartRef.current = null;
      lastTouchRef.current = null;
      initialPinchDistRef.current = 0;
      touchMovedRef.current = false;
      activeEventSystemRef.current = null; // Release so either system can start next gesture
    } else if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0];
      lastTouchRef.current = { x: remaining.x, y: remaining.y };
      initialPinchDistRef.current = 0;
    }
  }, [containerRef, dispatchCanvasTap]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointX = e.clientX - rect.left;
    const pointY = e.clientY - rect.top;

    setViewport((prev) => {
      const zoomDelta = -e.deltaY * 0.002;
      const newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, prev.targetZoom * (1 + zoomDelta)));
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
  }, [containerRef]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Update coordinate display
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
  }, [containerRef]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Keyboard navigation
  const pan = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({ ...prev, targetX: prev.targetX + dx, targetY: prev.targetY + dy }));
  }, []);

  const zoomIn = useCallback(() => {
    setViewport((prev) => ({ ...prev, targetZoom: Math.min(ZOOM.MAX, prev.targetZoom * 1.5) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((prev) => ({ ...prev, targetZoom: Math.max(ZOOM.MIN, prev.targetZoom / 1.5) }));
  }, []);

  const resetView = useCallback(() => {
    setViewport((prev) => ({ ...prev, targetX: 0, targetY: 0, targetZoom: ZOOM.DEFAULT }));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    if (!container.contains(document.activeElement) && document.activeElement !== container) return;

    const panStep = 50;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); pan(0, panStep); break;
      case 'ArrowDown': e.preventDefault(); pan(0, -panStep); break;
      case 'ArrowLeft': e.preventDefault(); pan(panStep, 0); break;
      case 'ArrowRight': e.preventDefault(); pan(-panStep, 0); break;
      case '+': case '=': e.preventDefault(); zoomIn(); break;
      case '-': case '_': e.preventDefault(); zoomOut(); break;
      case '0': e.preventDefault(); resetView(); break;
    }
  }, [containerRef, pan, zoomIn, zoomOut, resetView]);

  // ============================================================
  // ATTACH NATIVE LISTENERS - Using useLayoutEffect for earliest timing
  // { passive: false } is CRITICAL for preventDefault to work on mobile!
  //
  // IMPORTANT: Attach BOTH pointer AND touch events on mobile!
  // Many mobile browsers report PointerEvent support but don't fire events
  // reliably. Touch events are the reliable fallback. The handlers check
  // isTouchingRef to avoid double-processing.
  // ============================================================
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect if this is a touch-capable device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // ALWAYS attach touch events on touch devices - they're the most reliable
    // Touch events work on ALL mobile browsers including older iOS Safari
    if (isTouchDevice) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    // ALSO attach pointer events if supported - they handle stylus/pen input
    // and work better on some newer devices. The handlers filter by pointerType.
    if ('PointerEvent' in window) {
      container.addEventListener('pointerdown', handlePointerDown, { passive: false });
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp, { passive: false });
      window.addEventListener('pointercancel', handlePointerUp, { passive: false });
    }

    // Mouse/wheel events (desktop)
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    const isTouchInsideContainer = (event: TouchEvent) => {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return false;
      const rect = container.getBoundingClientRect();
      return (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      );
    };

    const documentTouchStart = (event: TouchEvent) => {
      if (!isTouchInsideContainer(event)) return;
      if (event.cancelable) event.preventDefault();
      if (activeEventSystemRef.current === null) {
        handleTouchStart(event);
      }
    };

    const documentTouchMove = (event: TouchEvent) => {
      if (!touchStartedInsideRef.current) return;
      if (event.cancelable) event.preventDefault();
      handleTouchMove(event);
    };

    const documentTouchEnd = (event: TouchEvent) => {
      if (!touchStartedInsideRef.current) return;
      handleTouchEnd(event);
    };

    document.addEventListener('touchstart', documentTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', documentTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', documentTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', documentTouchEnd, { passive: false, capture: true });

    return () => {
      // Clean up touch events
      if (isTouchDevice) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      }
      // Clean up pointer events
      if ('PointerEvent' in window) {
        container.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      }
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', documentTouchStart);
      document.removeEventListener('touchmove', documentTouchMove);
      document.removeEventListener('touchend', documentTouchEnd);
      document.removeEventListener('touchcancel', documentTouchEnd);
    };
  }, [
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
  ]);

  const centerOn = useCallback((canvasX: number, canvasY: number, zoom?: number) => {
    setViewport((prev) => {
      const targetZoom = zoom ?? prev.targetZoom;
      return { ...prev, targetX: -canvasX * targetZoom, targetY: -canvasY * targetZoom, targetZoom };
    });
  }, []);

  const toggleZoom = useCallback(() => {
    setViewport((prev) => ({ ...prev, targetZoom: prev.targetZoom < ZOOM.DRAW ? ZOOM.DRAW : ZOOM.DEFAULT }));
  }, []);

  const getCanvasCoords = useCallback((screenX: number, screenY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return screenToCanvas(screenX - rect.left, screenY - rect.top, viewportRef.current, rect.width, rect.height);
  }, [containerRef]);

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
