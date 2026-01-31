/**
 * Color palette - 16 colors matching Reddit r/place
 */

import type { ColorIndex } from '../types/canvas.js';

/** Hex color values indexed by color index */
export const COLOR_PALETTE: Record<ColorIndex, string> = {
  0: '#FFFFFF',  // White
  1: '#E4E4E4',  // Light Gray
  2: '#888888',  // Gray
  3: '#222222',  // Dark Gray
  4: '#FFA7D1',  // Pink
  5: '#E50000',  // Red
  6: '#E59500',  // Orange
  7: '#A06A42',  // Brown
  8: '#E5D900',  // Yellow
  9: '#94E044',  // Lime
  10: '#02BE01', // Green
  11: '#00D3DD', // Cyan
  12: '#0083C7', // Blue
  13: '#0000EA', // Dark Blue
  14: '#CF6EE4', // Purple
  15: '#820080', // Magenta
} as const;

/** Array of hex colors for iteration */
export const PALETTE_ARRAY = Object.values(COLOR_PALETTE);

/** Color names for display */
export const COLOR_NAMES: Record<ColorIndex, string> = {
  0: 'White',
  1: 'Light Gray',
  2: 'Gray',
  3: 'Dark Gray',
  4: 'Pink',
  5: 'Red',
  6: 'Orange',
  7: 'Brown',
  8: 'Yellow',
  9: 'Lime',
  10: 'Green',
  11: 'Cyan',
  12: 'Blue',
  13: 'Dark Blue',
  14: 'Purple',
  15: 'Magenta',
} as const;

/**
 * Convert hex color to RGBA values
 */
export function hexToRGBA(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255, 255];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    255,
  ];
}

/**
 * Pre-computed RGBA values as Uint32 for fast canvas rendering
 * Uses ABGR format for little-endian systems
 */
export const COLOR_RGBA_LOOKUP = new Uint32Array(
  PALETTE_ARRAY.map((hex) => {
    const [r, g, b, a] = hexToRGBA(hex);
    // ABGR format for little-endian
    return (a << 24) | (b << 16) | (g << 8) | r;
  })
);

/**
 * RGBA color object for PNG generation
 */
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Pre-computed RGBA objects as array for PNG export
 * Index by number (0-15) for runtime flexibility
 */
export const COLOR_PALETTE_RGBA: RGBAColor[] = PALETTE_ARRAY.map((hex) => {
  const [r, g, b, a] = hexToRGBA(hex);
  return { r, g, b, a };
});
