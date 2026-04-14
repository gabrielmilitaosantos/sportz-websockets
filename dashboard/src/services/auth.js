const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * Calls POST /auth/login and returns the JWT token string.
 * Does NOT store the token — that's the store's responsibility.
 */
export async function loginRequest(username, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Login failed");
  }

  return body.token;
}

// Checks whether a stored token is still valid
export async function verifyToken(token) {
  try {
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const body = await response.json();
    return body.username ?? null;
  } catch {
    return null;
  }
}
