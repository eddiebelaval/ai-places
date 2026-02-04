'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { useAuthStore } from '@/stores/auth-store';
import { useWeekStore } from '@/stores/week-store';
import type {
  ClientMessage,
  ServerMessage,
  ColorIndex,
} from '@aiplaces/shared';

// Production fallback ensures canvas works even if Vercel env var is misconfigured
const PRODUCTION_WS_URL = 'wss://aiplaces-ws.railway.app';
const DEFAULT_WS_URL = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : PRODUCTION_WS_URL;
const rawEnvUrl = process.env.NEXT_PUBLIC_WS_URL;
const normalizedEnvUrl =
  rawEnvUrl &&
  rawEnvUrl.startsWith('ws://') &&
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:'
    ? rawEnvUrl.replace(/^ws:/, 'wss:')
    : rawEnvUrl;
const envUrlIsValid =
  normalizedEnvUrl &&
  normalizedEnvUrl.startsWith('ws') &&
  !normalizedEnvUrl.includes('localhost');
const WS_URL = envUrlIsValid ? normalizedEnvUrl : DEFAULT_WS_URL;

interface UseWebSocketOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

// Singleton WebSocket instance to prevent multiple connections
let globalWs: WebSocket | null = null;
let globalWsConnecting = false;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(false);
  // Infinite retry with capped backoff - never give up reconnecting
  const baseReconnectDelay = 2000;
  const maxReconnectDelay = 64000; // Cap at 64 seconds

  const { setConnected, setCooldown, setReconnectAttempts } = useUIStore();
  const { initializeCanvas, updatePixel } = useCanvasStore();
  const { sessionToken } = useAuthStore();
  const { setConfig, setResetting, setLastReset } = useWeekStore();

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        switch (message.type) {
          case 'authenticated':
            // Set initial cooldown if any
            if (message.payload.cooldownSeconds > 0) {
              setCooldown(Date.now() + message.payload.cooldownSeconds * 1000);
            }
            break;

          case 'auth_error':
            console.error('[WS] Auth error:', message.payload.message);
            break;

          case 'canvas_state':
            initializeCanvas(message.payload.data);
            break;

          case 'pixel_placed':
            const { x, y, color, username, userId, isAgent } = message.payload;
            updatePixel(x, y, color as ColorIndex);
            // Dispatch pixel_activity event for ActivityFeed component
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('pixel_activity', {
                  detail: {
                    x,
                    y,
                    color,
                    // Map server field names to what ActivityFeed expects
                    agentName: isAgent ? username : undefined,
                    agentId: isAgent ? userId : undefined,
                  },
                })
              );
            }
            break;

          case 'pixel_error':
            console.error('[WS] Pixel error:', message.payload.code, message.payload.message);
            if (message.payload.remainingMs) {
              setCooldown(Date.now() + message.payload.remainingMs);
            }
            break;

          case 'cooldown_update':
            setCooldown(Date.now() + message.payload.remainingMs);
            break;

          case 'pong':
            break;

          case 'connection_count':
            break;

          case 'leaderboard_update':
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('leaderboard_update', {
                  detail: message.payload,
                })
              );
            }
            break;

          case 'week_config':
            setConfig(message.payload);
            break;

          case 'week_reset':
            // Clear canvas and update week config
            setResetting(true);
            // Small delay to show "resetting" state
            setTimeout(() => {
              initializeCanvas(''); // Clear canvas with empty data
              setConfig(message.payload.newConfig);
              setLastReset(message.payload.archiveId, message.payload.stats);
            }, 500);
            break;

          case 'week_warning':
            // Could show a toast notification here
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    },
    [initializeCanvas, updatePixel, setCooldown, setConfig, setResetting, setLastReset]
  );

  // Connect to WebSocket (singleton pattern)
  const connect = useCallback(() => {
    if (!WS_URL) {
      setConnected(false);
      return;
    }

    // If already connected or connecting, reuse the existing connection
    if (globalWs?.readyState === WebSocket.OPEN) {
      wsRef.current = globalWs;
      setConnected(true);
      return;
    }

    if (globalWsConnecting) {
      return;
    }

    globalWsConnecting = true;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        globalWsConnecting = false;
        globalWs = ws;
        wsRef.current = ws;
        setConnected(true);
        reconnectAttemptsRef.current = 0;

        // Auto-authenticate if we have a session token
        const currentToken = useAuthStore.getState().sessionToken;
        if (currentToken) {
          ws.send(
            JSON.stringify({
              type: 'authenticate',
              payload: { token: currentToken },
            })
          );
        } else {
          // Request canvas state for unauthenticated users
          ws.send(JSON.stringify({ type: 'get_canvas' }));
        }

        if (mountedRef.current) {
          options.onConnected?.();
        }
      };

      ws.onclose = (event) => {
        globalWsConnecting = false;
        globalWs = null;
        wsRef.current = null;
        setConnected(false);
        if (mountedRef.current) {
          options.onDisconnected?.();
        }

        // Infinite retry with exponential backoff capped at 64 seconds
        if (mountedRef.current) {
          reconnectAttemptsRef.current++;
          setReconnectAttempts(reconnectAttemptsRef.current);

          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
            maxReconnectDelay
          );
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        globalWsConnecting = false;
        if (mountedRef.current) {
          options.onError?.(error);
        }
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Failed to connect:', err);
      globalWsConnecting = false;
    }
  }, [handleMessage, setConnected, setReconnectAttempts, options]);

  // Send message
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send, not connected');
    }
  }, []);

  // Place pixel
  const placePixel = useCallback(
    (x: number, y: number, color: ColorIndex) => {
      send({
        type: 'place_pixel',
        payload: { x, y, color },
      });
    },
    [send]
  );

  // Authenticate (if we have a token)
  const authenticate = useCallback(
    (token: string) => {
      send({
        type: 'authenticate',
        payload: { token },
      });
    },
    [send]
  );

  // Send ping
  const ping = useCallback(() => {
    send({ type: 'ping' });
  }, [send]);

  // Disconnect (don't close global socket, just cleanup local refs)
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Don't close the global socket - other components might need it
    wsRef.current = null;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;

    // Small delay to avoid React Strict Mode double-mount race condition
    const connectTimeout = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        ping();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearTimeout(connectTimeout);
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, ping]);

  // Re-authenticate when sessionToken changes (handles login after connection established)
  useEffect(() => {
    if (sessionToken && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'authenticate',
          payload: { token: sessionToken },
        })
      );
    }
  }, [sessionToken]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
    send,
    placePixel,
    authenticate,
    ping,
  };
}
