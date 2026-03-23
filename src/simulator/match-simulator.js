// Automatically generates realistic commentary for live matches.
// Manages match progression, event generation, and score updates.

import { db, pool } from "../db/db.js";
import { commentary, matches } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  getRandomMessage,
  getTemplatesForSport,
  selectRandomEvent,
} from "./commentary-templates.js";
import { generateSquad, getRandomPlayer } from "./player-names.js";

// Get sport-specific configuration
function getSportConfig(sport) {
  const normalized = sport.toLowerCase();

  switch (normalized) {
    case "football":
    case "soccer":
      return {
        totalMinutes: 90,
        halftimeMinute: 45,
        periods: ["1st half", "2nd half"],
        eventIntervalMs: 8000, // 8 seconds per event
      };
    case "cricket":
      return {
        totalMinutes: 50, // Overs approximation
        halftimeMinute: 25,
        periods: ["1st innings", "2nd innings"],
        eventIntervalMs: 6000,
      };
    case "basketball":
      return {
        totalMinutes: 48,
        halftimeMinute: 24,
        periods: ["1st half", "2nd half"],
        eventIntervalMs: 5000,
      };
    default:
      return {
        totalMinutes: 90,
        halftimeMinute: 45,
        periods: ["1st half", "2nd half"],
        eventIntervalMs: 8000,
      };
  }
}

// Get score value based on event type
function getScoreValue(eventType) {
  switch (eventType) {
    case "goal":
      return 1;
    case "two_pointer":
      return 2;
    case "three_pointer":
      return 3;
    case "boundary":
      return 4;
    case "six":
      return 6;
    default:
      return 1;
  }
}

// Finalize match when simulation completes
async function finalizeMatch(matchId, homeScore, awayScore) {
  try {
    await db
      .update(matches)
      .set({ status: "finished" })
      .where(eq(matches.id, matchId));

    console.log(
      `[Simulator] Match ${matchId} finished: ${homeScore}-${awayScore}`,
    );
  } catch (error) {
    console.error(`[Simulator] Error finalizing match:`, error);
  }
}

// Generate a single match event
async function generateEvent(simulatorState, broadcastCallback) {
  const {
    match,
    currentMinute,
    currentSequence,
    currentPeriod,
    homeSquad,
    awaySquad,
    templates,
    homeScore,
    awayScore,
    config,
  } = simulatorState;

  // Check if match is over
  if (currentMinute > config.totalMinutes) {
    await finalizeMatch(match.id, homeScore, awayScore);
    return null; // Signal to stop
  }

  // Update period at halftime
  let newPeriod = currentPeriod;
  if (
    currentMinute > config.halftimeMinute &&
    currentPeriod === config.periods[0]
  ) {
    newPeriod = config.periods[1];
  }

  // Select event template
  const template = selectRandomEvent(templates);
  const message = getRandomMessage(template);

  // Determine team and actor
  const isHomeTeam = Math.random() > 0.5;
  const team = isHomeTeam ? match.homeTeam : match.awayTeam;
  const squad = isHomeTeam ? homeSquad : awaySquad;
  const actor = getRandomPlayer(squad);

  // Build commentary object
  const commentaryData = {
    matchId: match.id,
    minute: currentMinute,
    sequence: currentSequence,
    period: newPeriod,
    eventType: template.eventType,
    team,
    actor,
    message: `${message} (${team})`,
    tags: [template.eventType],
    metadata: null,
  };

  // Compute new scores before the transaction so the values are ready
  let newHomeScore = homeScore;
  let newAwayScore = awayScore;

  if (template.scoreDelta) {
    const scoringTeam = isHomeTeam ? "home" : "away";

    if (scoringTeam === "home") {
      newHomeScore += getScoreValue(template.eventType);
    } else {
      newAwayScore += getScoreValue(template.eventType);
    }

    commentaryData.metadata = {
      scoreDelta: {
        home: scoringTeam === "home" ? getScoreValue(template.eventType) : 0,
        away: scoringTeam === "away" ? getScoreValue(template.eventType) : 0,
      },
      currentScore: {
        home: newHomeScore,
        away: newAwayScore,
      },
    };
  }

  // Persist score update (if any) and commentary in a single transaction
  let inserted;
  const client = await pool.connect();
  const tx = drizzle(client);
  try {
    await client.query("BEGIN");

    if (template.scoreDelta) {
      await tx
        .update(matches)
        .set({ homeScore: newHomeScore, awayScore: newAwayScore })
        .where(eq(matches.id, match.id));
    }

    const [row] = await tx
      .insert(commentary)
      .values(commentaryData)
      .returning();

    await client.query("COMMIT");
    inserted = row;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `[Simulator] Transaction failed for match ${match.id} - Min ${currentMinute}: ${error}`,
    );
    // Rollback complete; do not advance state
    return simulatorState;
  } finally {
    client.release();
  }

  // Broadcast only after the transaction has committed
  if (broadcastCallback) {
    broadcastCallback(match.id, inserted);
  }

  console.log(
    `[Simulator] Match ${match.id} - Min ${currentMinute}: ${template.eventType}`,
  );

  // Progress match time only on success
  const newSequence = currentSequence + 1;

  // Increment minute occasionally (not every event)
  const newMinute = Math.random() > 0.4 ? currentMinute + 1 : currentMinute;

  // Return updated state
  return {
    ...simulatorState,
    currentMinute: newMinute,
    currentSequence: newSequence,
    currentPeriod: newPeriod,
    homeScore: newHomeScore,
    awayScore: newAwayScore,
  };
}

// Rehydrate simulator position from the latest commentary row for this match
async function rehydrateState(matchId, config) {
  try {
    const [latest] = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(1);

    if (!latest) return null;

    return {
      currentMinute: latest.minute ?? 1,
      currentSequence: (latest.sequence ?? 0) + 1,
      currentPeriod: latest.period ?? config.periods[0],
    };
  } catch (error) {
    console.error(
      `[Simulator] Failed to rehydrate state for match ${matchId}:`,
      error,
    );
    return null;
  }
}

// Create a new match simulator
async function createMatchSimulator(matchData, broadcastCallback, onFinished) {
  const config = getSportConfig(matchData.sport);

  const rehydrated = await rehydrateState(matchData.id, config);

  if (rehydrated) {
    console.log(
      `[Simulator] Rehydrated match ${matchData.id} from minute ${rehydrated.currentMinute}, sequence ${rehydrated.currentSequence}, period "${rehydrated.currentPeriod}"`,
    );
  }

  let state = {
    match: matchData,
    currentMinute: rehydrated?.currentMinute ?? 1,
    currentSequence: rehydrated?.currentSequence ?? 1,
    currentPeriod: rehydrated?.currentPeriod ?? config.periods[0],
    homeSquad: generateSquad(11),
    awaySquad: generateSquad(11),
    templates: getTemplatesForSport(matchData.sport),
    homeScore: matchData.homeScore || 0,
    awayScore: matchData.awayScore || 0,
    config,
  };
  let timeoutId = null;
  let cancelled = false;

  const stop = () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    console.log(`[Simulator] Stopped match ${matchData.id}`);
  };

  const start = () => {
    console.log(
      `[Simulator] Starting match ${matchData.id}: ${matchData.homeTeam} vs ${matchData.awayTeam}`,
    );

    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        const newState = await generateEvent(state, broadcastCallback);

        if (cancelled) return;

        if (newState === null) {
          stop();
          onFinished?.(matchData.id);
        } else {
          state = newState;
          scheduleNext();
        }
      }, config.eventIntervalMs);
    };
    scheduleNext();
  };

  return {
    start,
    stop,
  };
}

// Create Match Simulator Manager
function createSimulatorManager() {
  const activeSimulators = new Map();
  let broadcastCallback = null;

  return {
    setBroadcastCallback(callback) {
      broadcastCallback = callback;
    },

    // Start simulating a match
    async startMatch(matchData) {
      if (activeSimulators.has(matchData.id)) {
        console.warn(
          `[SimulatorManager] Match ${matchData.id} is already being simulated`,
        );
        return;
      }

      const simulator = await createMatchSimulator(
        matchData,
        broadcastCallback,
        (matchId) => {
          activeSimulators.delete(matchId);
          console.log(
            `[SimulatorManager] Match ${matchId} removed from active simulators after finishing`,
          );
        },
      );
      activeSimulators.set(matchData.id, simulator);
      simulator.start();
    },

    // Stop simulating a match
    stopMatch(matchId) {
      const simulator = activeSimulators.get(matchId);

      if (simulator) {
        simulator.stop();
        activeSimulators.delete(matchId);
      }
    },

    // Stop all active simulations
    stopAll() {
      for (const simulator of activeSimulators.values()) {
        simulator.stop();
      }
      activeSimulators.clear();
    },

    isSimulating(matchId) {
      return activeSimulators.has(matchId);
    },

    getActiveCount() {
      return activeSimulators.size;
    },

    // Auto-start simulations for all live matches
    async autoStartLiveMatches() {
      try {
        const liveMatches = await db
          .select()
          .from(matches)
          .where(eq(matches.status, "live"));

        for (const match of liveMatches) {
          if (!activeSimulators.has(match.id)) {
            this.startMatch(match);
          }
        }

        console.log(
          `[SimulatorManager] Auto-started ${liveMatches.length} live matches`,
        );
      } catch (error) {
        console.error("[SimulatorManager] Error auto-starting matches:", error);
      }
    },
  };
}

// Singleton instance
export const simulatorManager = createSimulatorManager();
