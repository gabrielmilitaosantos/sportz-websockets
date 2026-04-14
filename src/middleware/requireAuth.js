import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Express middleware that validates the JWT on every protected request.
 * Attach to any router that should require authentication
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);

  try {
    // Attach the decoded payload so downstream handlers can read req.user.username
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
}
