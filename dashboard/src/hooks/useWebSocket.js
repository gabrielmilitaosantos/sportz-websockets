import { useCallback, useEffect, useRef } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

const BACKOFF_BASE_MS = 1_000; // initial retry delay
const BACKOFF_MAX_MS = 30_000; // maximum retry delay (caps exponential growth)

/**
 * Manages a singleton WebSocket connection to /ws.
 *
 * Usage:
 *   const { subscribe, unsubscribe } = useWebSocket(onMessage);
 *
 * onMessage receives every parsed message object from the server.
 * The caller decides what to do with it based on message.type.
 */
export function useWebSocket(onMessage) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Queue for subscribe/unsubscribe calls that arrive before the socket opens
  const pendingRef = useRef([]);

  // Keep the ref up to date without restarting the connection on every render
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Signals intentional shutdown so the onclose handler doesn't schedule a retry
  const unmountedRef = useRef(false);
  // Holds the pending setTimeout id for the next reconnect attempt
  const retryTimerRef = useRef(null);
  // Tracks the current backoff delay; reset to BACKOFF_BASE_MS on a successful open
  const backoffRef = useRef(BACKOFF_BASE_MS);

  useEffect(() => {
    unmountedRef.current = false;

    function detachHandlers(socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
    }

    function closeSocket(socket) {
      detachHandlers(socket);
      if (socket.readyState === WebSocket.CONNECTING) {
        // Closing while CONNECTING triggers onerror in most browsers.
        // Wait for the handshake to finish, then close cleanly.
        socket.addEventListener("open", () => socket.close());
      } else {
        socket.close();
      }
    }

    function connect() {
      const socket = new WebSocket(`${WS_URL}/ws`);
      ws.current = socket;

      let opened = false;

      socket.onopen = () => {
        opened = true;
        // Successful connection - reset backoff for the next disconnect cycle
        backoffRef.current = BACKOFF_BASE_MS;

        // Drain any subscribe calls that were made before the connection opened
        for (const msg of pendingRef.current) {
          socket.send(JSON.stringify(msg));
        }
        pendingRef.current = [];
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // Ignore
        }
      };

      socket.onerror = () => {
        // StrictMode closes the socket during CONNECTING, which fires onerror
        // with a generic CloseEvent - not a real network error.
        if (opened) {
          console.error("[WS] Connection error:");
        }
      };

      socket.onclose = () => {
        // Null out ws.current so 'send' stops trying to use this dead socket
        ws.current = null;
        detachHandlers(socket);

        // Don't reconnect after an intentional unmount
        if (unmountedRef.current) return;

        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, BACKOFF_MAX_MS);

        console.warn(`[WS] Disconnected. Reconnecting in ${delay}ms`);
        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      // Mark as intentionally closed *before* calling socket.close()
      unmountedRef.current = true;

      // Cancel any in-flight backoff timer
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // Close the live socket (if any) and strip all its handlers
      const socket = ws.current;
      ws.current = null;
      if (socket) closeSocket(socket);
    };
  }, []);

  const send = useCallback((payload) => {
    const socket = ws.current;
    if (!socket) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      // Socket not ready yet - queue the message to be sent on open
      pendingRef.current.push(payload);
    } else {
      console.warn(
        `[WS] 'send' called while socket is ${socket.readyState === WebSocket.CLOSING ? "CLOSING" : "CLOSED"}. ` +
          "Queuing payload for reconnection: ",
        payload,
      );
      pendingRef.current.push(payload);
    }
  }, []);

  const subscribe = useCallback(
    (matchId) => {
      send({ type: "subscribe", matchId });
    },
    [send],
  );

  const unsubscribe = useCallback(
    (matchId) => {
      send({ type: "unsubscribe", matchId });
    },
    [send],
  );

  return { subscribe, unsubscribe };
}
