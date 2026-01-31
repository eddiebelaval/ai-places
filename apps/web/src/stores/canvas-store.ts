'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BITS_PER_PIXEL,
  COLOR_RGBA_LOOKUP,
} from '@aiplaces/shared';
import type { ColorIndex, PixelUpdate } from '@aiplaces/shared';

const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

interface CanvasState {
  /** Unpacked color indices (one byte per pixel) */
  colorIndices: Uint8Array | null;

  /** Canvas version for change tracking */
  version: number;

  /** Loading state */
  isLoading: boolean;
  error: string | null;

  /** Actions */
  initializeCanvas: (base64Data: string) => void;
  updatePixel: (x: number, y: number, color: ColorIndex) => void;
  batchUpdatePixels: (updates: PixelUpdate[]) => void;
  getPixelColor: (x: number, y: number) => ColorIndex | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Unpack 4-bit bitfield to color indices
 * Each byte contains 2 pixels: high nibble = first, low nibble = second
 */
function unpackBitfield(packed: Uint8Array): Uint8Array {
  const unpacked = new Uint8Array(TOTAL_PIXELS);
  for (let i = 0; i < packed.length; i++) {
    const byte = packed[i];
    unpacked[i * 2] = (byte >> 4) & 0x0f;
    unpacked[i * 2 + 1] = byte & 0x0f;
  }
  return unpacked;
}

/**
 * Decode base64 canvas data
 */
function decodeCanvasData(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return unpackBitfield(bytes);
}

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector(
    immer((set, get) => ({
        colorIndices: null,
        version: 0,
        isLoading: true,
        error: null,

        initializeCanvas: (base64Data) => {
          try {
            const colorIndices = decodeCanvasData(base64Data);
            set((state) => {
              state.colorIndices = colorIndices;
              state.version = 1;
              state.isLoading = false;
              state.error = null;
            });
          } catch (err) {
            set((state) => {
              state.error = 'Failed to decode canvas data';
              state.isLoading = false;
            });
          }
        },

        updatePixel: (x, y, color) => {
          set((state) => {
            if (!state.colorIndices) return;

            const offset = y * CANVAS_WIDTH + x;
            if (offset >= 0 && offset < TOTAL_PIXELS) {
              state.colorIndices[offset] = color;
              state.version++;
            }
          });
        },

        batchUpdatePixels: (updates) => {
          set((state) => {
            if (!state.colorIndices) return;

            for (const update of updates) {
              const offset = update.y * CANVAS_WIDTH + update.x;
              if (offset >= 0 && offset < TOTAL_PIXELS) {
                state.colorIndices[offset] = update.color;
              }
            }
            state.version++;
          });
        },

        getPixelColor: (x, y) => {
          const { colorIndices } = get();
          if (!colorIndices) return null;

          const offset = y * CANVAS_WIDTH + x;
          if (offset >= 0 && offset < TOTAL_PIXELS) {
            return colorIndices[offset] as ColorIndex;
          }
          return null;
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
            state.isLoading = false;
          });
        },
    }))
  )
);
