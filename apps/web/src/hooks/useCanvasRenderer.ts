'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_RGBA_LOOKUP,
} from '@aiplaces/shared';
import type { PixelUpdate } from '@aiplaces/shared';

const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

interface UseCanvasRendererOptions {
  onReady?: () => void;
}

/**
 * Hook for efficient canvas rendering using requestAnimationFrame
 */
export function useCanvasRenderer(options: UseCanvasRendererOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const data32Ref = useRef<Uint32Array | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const pendingDataRef = useRef<Uint8Array | null>(null);
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Store onReady in ref to avoid dependency issues
  const onReadyRef = useRef(options.onReady);
  onReadyRef.current = options.onReady;

  // Initialize canvas context (runs once when canvas element is available)
  useEffect(() => {
    // Prevent re-initialization
    if (initializedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });

    if (!ctx) return;

    initializedRef.current = true;
    ctxRef.current = ctx;
    imageDataRef.current = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    data32Ref.current = new Uint32Array(imageDataRef.current.data.buffer);

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // If there was pending data, render it now
    if (pendingDataRef.current) {
      for (let i = 0; i < TOTAL_PIXELS; i++) {
        data32Ref.current[i] = COLOR_RGBA_LOOKUP[pendingDataRef.current[i]];
      }
      isDirtyRef.current = true;
      pendingDataRef.current = null;
    }

    setIsReady(true);
    onReadyRef.current?.();
  }, []); // Empty deps - only run once when canvas ref is available

  // Animation frame loop for batched rendering
  useEffect(() => {
    const render = () => {
      if (isDirtyRef.current && ctxRef.current && imageDataRef.current) {
        ctxRef.current.putImageData(imageDataRef.current, 0, 0);
        isDirtyRef.current = false;
      }
      rafIdRef.current = requestAnimationFrame(render);
    };

    rafIdRef.current = requestAnimationFrame(render);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Render initial state from color indices
  const renderInitialState = useCallback((colorIndices: Uint8Array) => {
    // If canvas isn't ready yet, store data for later
    if (!data32Ref.current) {
      pendingDataRef.current = colorIndices;
      return;
    }

    for (let i = 0; i < TOTAL_PIXELS; i++) {
      data32Ref.current[i] = COLOR_RGBA_LOOKUP[colorIndices[i]];
    }
    isDirtyRef.current = true;
  }, []);

  // Queue single pixel update
  const queuePixelUpdate = useCallback((update: PixelUpdate) => {
    if (!data32Ref.current) return;

    const offset = update.y * CANVAS_WIDTH + update.x;
    if (offset >= 0 && offset < TOTAL_PIXELS) {
      data32Ref.current[offset] = COLOR_RGBA_LOOKUP[update.color];
      isDirtyRef.current = true;
    }
  }, []);

  // Queue batch of pixel updates
  const queueBatchUpdate = useCallback((updates: PixelUpdate[]) => {
    if (!data32Ref.current) return;

    for (const update of updates) {
      const offset = update.y * CANVAS_WIDTH + update.x;
      if (offset >= 0 && offset < TOTAL_PIXELS) {
        data32Ref.current[offset] = COLOR_RGBA_LOOKUP[update.color];
      }
    }
    isDirtyRef.current = true;
  }, []);

  return {
    canvasRef,
    isReady,
    renderInitialState,
    queuePixelUpdate,
    queueBatchUpdate,
  };
}
