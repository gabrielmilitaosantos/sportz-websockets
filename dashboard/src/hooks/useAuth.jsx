import { create } from "zustand";
import { loginRequest, verifyToken } from "../services/auth.js";

/**
 * Global auth store (Zustand).
 *
 * State shape:
 *   token      — JWT string or null
 *   username   — logged-in username or null
 *   status     — "idle" | "loading" | "authenticated" | "unauthenticated"
 *   error      — last login error message or null
 */
export const useAuthStore = create((set, get) => ({
  token: null,
  username: null,
  status: "idle",
  error: null,

  // Called once on app mount (App.jsx via useEffect).
  // Reads any stored token, verifies it with the backend, and hydrates state.
  initialize: async () => {
    // Avoid re-running if already initialized
    if (get().status !== "idle") return;

    set({ status: "loading" });

    const stored = localStorage.getItem("auth_token");

    if (!stored) {
      set({ status: "unauthenticated" });
      return;
    }

    const username = await verifyToken(stored);

    if (username) {
      set({ token: stored, username, status: "authenticated" });
    } else {
      localStorage.removeItem("auth_token");
      set({ status: "unauthenticated" });
    }
  },

  login: async (username, password) => {
    set({ status: "loading", error: null });

    try {
      const token = await loginRequest(username, password);
      localStorage.setItem("auth_token", token);
      set({ token, username, status: "authenticated" });
    } catch (error) {
      localStorage.removeItem("auth_token");
      set({
        token: null,
        username: null,
        status: "unauthenticated",
        error: error instanceof Error ? error.message : "Login failed",
      });
    }
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    set({
      token: null,
      username: null,
      status: "unauthenticated",
      error: null,
    });
  },
}));
