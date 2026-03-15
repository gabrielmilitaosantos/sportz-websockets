import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../../config/arcjet.js";

const matchSubscribers = new Map();
const MAX_SUBSCRIPTIONS_PER_SOCKET = 100;

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  try {
    socket.send(JSON.stringify(payload), (error) => {
      if (error) {
        console.error("Failed to send websocket message", error);
      }
    });
  } catch (error) {
    console.error("Failed to send websocket message", error);
  }
}

function broadcastToAll(wss, payload) {
  const message = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    try {
      client.send(message, (error) => {
        if (error) {
          console.error("Failed to send websocket message", error);
        }
      });
    } catch (error) {
      console.error("Failed to send websocket message", error);
    }
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState !== WebSocket.OPEN) continue;

    try {
      client.send(message, (error) => {
        if (error) {
          console.error("Failed to send websocket message", error);
        }
      });
    } catch (error) {
      console.error("Failed to send websocket message", error);
    }
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (
    message?.type === "subscribe" &&
    Number.isInteger(message.matchId) &&
    message.matchId > 0
  ) {
    if (socket.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
      sendJson(socket, {
        type: "error",
        message: "Subscription limit reached",
      });
      return;
    }
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (
    message?.type === "unsubscribe" &&
    Number.isInteger(message.matchId) &&
    message.matchId > 0
  ) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 1024, // 1MB (Maximum size of message)
  });

  // Apply Arcjet protection before WebSocket handshake
  server.on("upgrade", async (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const statusCode = decision.reason.isRateLimit() ? 429 : 403;
          const reason = decision.reason.isRateLimit()
            ? "Rate Limit Exceeded"
            : "Access Denied";

          socket.write(
            `HTTP/1.1 ${statusCode} ${reason}\r\nConnection: close\r\n\r\n`,
          );
          socket.destroy();
          return;
        }
      } catch (error) {
        console.error("WS upgrade protection error: ", error);
        socket.write(
          "HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n",
        );
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket, _req) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", (error) => {
      console.error(error);
      socket.terminate();
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}
