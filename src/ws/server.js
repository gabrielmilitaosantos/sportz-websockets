import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../../config/arcjet.js";

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

function broadcast(wss, payload) {
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

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
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
            `HTTP/1.1 ${statusCode} ${reason}\r\n` + `Connection: close\r\n`,
          );
          socket.destroy();
          return;
        }
      } catch (error) {
        console.error("WS upgrade protection error: ", error);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n");
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

    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
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
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}
