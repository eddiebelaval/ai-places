'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { useAuthStore } from '@/stores/auth-store';
import type {
  ClientMessage,
  ServerMessage,
  ColorIndex,
} from '@x-place/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

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

  const { setConnected, setCooldown } = useUIStore();
  const { initializeCanvas, updatePixel } = useCanvasStore();
  const { sessionToken } = useAuthStore();

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('[WS] Received:', message.type);

        switch (message.type) {
          case 'authenticated':
            console.log('[WS] Authenticated as:', message.payload.username);
            // Set initial cooldown if any
            if (message.payload.cooldownSeconds > 0) {
              setCooldown(Date.now() + message.payload.cooldownSeconds * 1000);
            }
            break;

          case 'auth_error':
            console.error('[WS] Auth error:', message.payload.message);
            break;

          case 'canvas_state':
            console.log('[WS] Received canvas state, version:', message.payload.version);
            initializeCanvas(message.payload.data);
            break;

          case 'pixel_placed':
            const { x, y, color } = message.payload;
            console.log(`[WS] Pixel placed at (${x}, ${y}) with color ${color}`);
            updatePixel(x, y, color as ColorIndex);
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
            console.log('[WS] Pong received, server time:', message.payload.serverTime);
            break;

          case 'connection_count':
            console.log('[WS] Active connections:', message.payload.count);
            break;

          case 'leaderboard_update':
            console.log('[WS] Leaderboard update received');
            // TODO: Update leaderboard store
            break;

          default:
            console.log('[WS] Unknown message type:', (message as any).type);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    },
    [initializeCanvas, updatePixel, setCooldown]
  );

  // Connect to WebSocket (singleton pattern)
  const connect = useCallback(() => {
    // If already connected or connecting, reuse the existing connection
    if (globalWs?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected (global)');
      wsRef.current = globalWs;
      setConnected(true);
      return;
    }

    if (globalWsConnecting) {
      console.log('[WS] Connection already in progress');
      return;
    }

    console.log('[WS] Connecting to:', WS_URL);
    globalWsConnecting = true;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
        globalWsConnecting = false;
        globalWs = ws;
        wsRef.current = ws;
        setConnected(true);
        reconnectAttemptsRef.current = 0;

        // Auto-authenticate if we have a session token
        const currentToken = useAuthStore.getState().sessionToken;
        if (currentToken) {
          console.log('[WS] Auto-authenticating with session token');
          ws.send(
            JSON.stringify({
              type: 'authenticate',
              payload: { token: currentToken },
            })
          );
        }

        if (mountedRef.current) {
          options.onConnected?.();
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        globalWsConnecting = false;
        globalWs = null;
        wsRef.current = null;
        setConnected(false);
        if (mountedRef.current) {
          options.onDisconnected?.();
        }

        // Infinite retry with exponential backoff capped at 64 seconds
        if (mountedRef.current) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            maxReconnectDelay
          );
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current++;
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
  }, [handleMessage, setConnected, options]);

  // Send message
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('[WS] Sent:', message.type);
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
      console.log('[WS] Session token changed, re-authenticating...');
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
