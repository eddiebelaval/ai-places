'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ZOOM, type ColorIndex } from '@aiplaces/shared';

interface UIState {
  /** Selected color index (0-15) */
  selectedColor: ColorIndex;

  /** Current cursor position on canvas */
  currentX: number;
  currentY: number;

  /** Zoom level */
  zoom: number;

  /** UI visibility */
  isSidebarOpen: boolean;
  isMinimapOpen: boolean;
  isMobileMode: boolean;

  /** Cooldown end timestamp */
  cooldownEnd: number | null;

  /** Hovered pixel coordinates */
  hoveredPixel: { x: number; y: number } | null;

  /** WebSocket connection status */
  isConnected: boolean;

  /** Reconnection attempt count (0 = first connect or stable connection) */
  reconnectAttempts: number;

  /** Actions */
  setSelectedColor: (color: ColorIndex) => void;
  setCoordinates: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  toggleSidebar: () => void;
  toggleMinimap: () => void;
  setMobileMode: (isMobile: boolean) => void;
  setCooldown: (endTime: number) => void;
  clearCooldown: () => void;
  setHoveredPixel: (pixel: { x: number; y: number } | null) => void;
  setConnected: (connected: boolean) => void;
  setReconnectAttempts: (attempts: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    immer((set) => ({
        selectedColor: 0 as ColorIndex,
        currentX: 250,
        currentY: 250,
        zoom: ZOOM.DEFAULT,
        isSidebarOpen: true,
        isMinimapOpen: true,
        isMobileMode: false,
        cooldownEnd: null,
        hoveredPixel: null,
        isConnected: false,
        reconnectAttempts: 0,

        setSelectedColor: (color) => {
          set((state) => {
            state.selectedColor = color;
          });
        },

        setCoordinates: (x, y) => {
          set((state) => {
            state.currentX = x;
            state.currentY = y;
          });
        },

        setZoom: (zoom) => {
          set((state) => {
            state.zoom = zoom;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
          });
        },

        toggleMinimap: () => {
          set((state) => {
            state.isMinimapOpen = !state.isMinimapOpen;
          });
        },

        setMobileMode: (isMobile) => {
          set((state) => {
            state.isMobileMode = isMobile;
            if (isMobile) {
              state.isSidebarOpen = false;
            }
          });
        },

        setCooldown: (endTime) => {
          set((state) => {
            state.cooldownEnd = endTime;
          });
        },

        clearCooldown: () => {
          set((state) => {
            state.cooldownEnd = null;
          });
        },

        setHoveredPixel: (pixel) => {
          set((state) => {
            state.hoveredPixel = pixel;
          });
        },

        setConnected: (connected) => {
          set((state) => {
            state.isConnected = connected;
            if (connected) {
              state.reconnectAttempts = 0;
            }
          });
        },

        setReconnectAttempts: (attempts) => {
          set((state) => {
            state.reconnectAttempts = attempts;
          });
        },
      })),
    {
      name: 'aiplaces-ui',
      partialize: (state) => ({
        selectedColor: state.selectedColor,
        isMinimapOpen: state.isMinimapOpen,
      }),
    }
  )
);
