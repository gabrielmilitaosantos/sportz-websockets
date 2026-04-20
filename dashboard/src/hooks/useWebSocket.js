import { useCallback, useEffect, useRef } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

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

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws`);
    ws.current = socket;

    let opened = false;

    socket.onopen = () => {
      opened = true;
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

    return () => {
      // Detach all handlers before closing events from this discarded socket
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      ws.current = null;

      if (socket.readyState === WebSocket.CONNECTING) {
        // Closing while CONNECTING triggers onerror in most browsers.
        // Wait for the handshake to finish, then close cleanly.
        socket.addEventListener("open", () => socket.close());
      } else {
        socket.close();
      }
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
