import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "../config/arcjet.js";
import { commentaryRouter } from "./routes/commentary.js";
import { simulatorRouter } from "./routes/simulator.js";
import { simulatorManager } from "./simulator/match-simulator.js";

const rawPort = process.env.PORT ?? "8000";
const PORT = Number.parseInt(rawPort, 10);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${rawPort}`);
}

const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(securityMiddleware());

app.get("/", (req, res) => {
  res.send("Welcome to the server!");
});

app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);
app.use("/simulator", simulatorRouter);

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);
// app.locals is the express global object accessible from any request
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

// Connect simulator to WebSocket broadcast
simulatorManager.setBroadcastCallback(broadcastCommentary);

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );

  // Auto-start simulations for live matches
  simulatorManager.autoStartLiveMatches().catch((error) => {
    console.error("[Server] Failed to auto-start live matches: ", error);
  });
});
