const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * Thin fetch wrapper used by all service calls.
 *
 * - Automatically injects the Authorization header from localStorage.
 * - Throws a structured error on non-2xx responses so callers and
 *   TanStack Query can handle them uniformly.
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) // Only set Content-type when a request body is present.
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) return null;

  return response.json();
}
