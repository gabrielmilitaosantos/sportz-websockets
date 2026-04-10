import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

/**
 * Required in Node.js environments - Neon uses WebSockets for connections,
 * but Node.js has no native WebSocket. Without this, the first connection
 * attempt fails with a "peer" error and the pool retries on the second request.
 */
neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
