import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema,
} from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { serializeMatchTimes } from "../utils/datetime.js";
import { desc, eq } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

// GET /matches
matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query.",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    res.json({ data: data.map(serializeMatchTimes) });
  } catch (error) {
    console.error("Failed to list matches", error);
    res.status(500).json({ error: "Failed to list matches." });
  }
});

// POST /matches
matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload.",
      details: parsed.error.issues,
    });
  }

  const { startTime, endTime, homeScore, awayScore, ...rest } = parsed.data;

  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : null;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...rest,
        startTime: startDate,
        endTime: endDate,
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startDate, endDate),
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(serializeMatchTimes(event));
    }
    res.status(201).json({ data: serializeMatchTimes(event) });
  } catch (error) {
    console.error("Failed to create match", error);
    res.status(500).json({
      error: "Failed to create match",
    });
  }
});

// PATCH /matches/:id/score
matchRouter.patch("/:id/score", async (req, res) => {
  const matchId = matchIdParamSchema.safeParse(req.params);

  if (!matchId.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: matchId.error.issues,
    });
  }

  const parsedBody = updateScoreSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "homeScore and awayScore must be non-negative integers.",
    });
  }

  const { homeScore, awayScore } = parsedBody.data;
  const { id } = matchId.data;

  try {
    const [updated] = await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.status(200).json({ data: serializeMatchTimes(updated) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update score" });
  }
});
