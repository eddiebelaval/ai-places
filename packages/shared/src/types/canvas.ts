/**
 * Canvas-related types for X-Place
 */

/** Color index (0-15) for the 16-color palette */
export type ColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/** A single pixel update */
export interface PixelUpdate {
  x: number;
  y: number;
  color: ColorIndex;
  timestamp?: number;
}

/** Pixel with attribution */
export interface PixelPlacement extends PixelUpdate {
  userId: string;
  username: string;
  factionId: string | null;
  timestamp: number;
  isAgent?: boolean;
}

/** Canvas state metadata */
export interface CanvasState {
  /** Base64 encoded canvas data (500x500 x 4 bits = 125KB) */
  data: string;
  /** Canvas version for cache invalidation */
  version: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

/** Viewport state for pan/zoom */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

/** Coordinates on the canvas */
export interface Coordinates {
  x: number;
  y: number;
}
