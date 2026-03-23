import { Router } from "express";
import { simulatorManager } from "../simulator/match-simulator.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const simulatorRouter = Router();

// '/simulator'
simulatorRouter.get("/status", (req, res) => {
  const activeCount = simulatorManager.getActiveCount();

  res.json({
    active: activeCount > 0,
    activeSimulations: activeCount,
  });
});

/**
 * POST /simulator/start/:matchId
 * Start simulating a specific match
 */
simulatorRouter.post("/start/:matchId", async (req, res) => {
  const matchId = Number(req.params.matchId);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  // Check if already simulating
  if (simulatorManager.isSimulating(matchId)) {
    return res.status(409).json({
      error: "Match is already being simulated",
    });
  }

  try {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Start simulation
    await simulatorManager.startMatch(match);

    res.json({
      message: "Simulation started",
      matchId,
    });
  } catch (error) {
    console.error("Error starting simulation:", error);
    res.status(500).json({ error: "Failed to start simulation" });
  }
});

/**
 * POST /simulator/stop/:matchId
 * Stop simulating a specific match
 */
simulatorRouter.post("/stop/:matchId", (req, res) => {
  const matchId = Number(req.params.matchId);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  if (!simulatorManager.isSimulating(matchId)) {
    return res.status(404).json({
      error: "Match is not being simulated",
    });
  }

  simulatorManager.stopMatch(matchId);

  res.json({
    message: "Simulation stopped",
    matchId,
  });
});

/**
 * POST /simulator/stop-all
 * Stop all active simulations
 */
simulatorRouter.post("/stop-all", (req, res) => {
  const count = simulatorManager.getActiveCount();
  simulatorManager.stopAll();

  res.json({
    message: "All simulations stopped",
    stoppedCount: count,
  });
});
