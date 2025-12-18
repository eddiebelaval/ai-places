'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useCanvasStore } from '@/stores/canvas-store';
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

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;

  const { setConnected, setCooldown } = useUIStore();
  const { initializeCanvas, updatePixel } = useCanvasStore();

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

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    console.log('[WS] Connecting to:', WS_URL);

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        options.onConnected?.();
        // Server sends canvas state automatically on connection
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;
        options.onDisconnected?.();

        // Attempt reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('[WS] Max reconnect attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        options.onError?.(error);
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Failed to connect:', err);
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

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, [setConnected]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        ping();
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, ping]);

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
