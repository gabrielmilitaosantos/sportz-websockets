import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET) throw new Error("JWT_SECRET isn't defined");
if (!ADMIN_USERNAME) throw new Error("ADMIN_USERNAME is required");
if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is required");

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const { username, password } = parsed.data;

  // Constant-time comparison to prevent timing attacks.
  /*
   * A simple === comparison leaks information about how many characters
   * matched before the first mismatch — an attacker can brute-force
   * credentials character by character by measuring response time.
   */
  const encoder = new TextEncoder();

  const usernameBuffer = encoder.encode(username);
  const adminUsernameBuffer = encoder.encode(ADMIN_USERNAME);

  const passwordBuffer = encoder.encode(password);
  const adminPasswordBuffer = encoder.encode(ADMIN_PASSWORD);

  const userNameMatch =
    usernameBuffer.length === adminUsernameBuffer.length &&
    timingSafeEqual(usernameBuffer, adminUsernameBuffer);

  const passwordMatch =
    passwordBuffer.length === adminPasswordBuffer.length &&
    timingSafeEqual(passwordBuffer, adminPasswordBuffer);

  if (!userNameMatch || !passwordMatch) {
    // Always return the same message regardless of which field was wrong.
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });

  return res.status(200).json({ token });
});

// POST /auth/verify — lets the frontend check if a stored token is still valid
authRouter.post("/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, username: payload.username });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});
