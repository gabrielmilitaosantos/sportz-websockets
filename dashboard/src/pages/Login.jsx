import { useEffect, useState } from "react";
import { useAuthStore } from "../hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Only subscribe to the values that change and drive re-renders
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);

  // Actions never change - read them directly from the store instance
  const login = useAuthStore.getState().login;

  const navigate = useNavigate();

  // Redirect immediately if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  const isLoading = status === "loading";

  async function handleSubmit(e) {
    e.preventDefault();
    await login(username.trim(), password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="relative w-full max-w-sm">
        {/* Logo / brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            {/* Simple scoreboard icon via SVG */}
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
              <path d="M7 8h2m4 0h2M12 8v4" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Sportz Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to manage live matches
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/12 p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-950/30 border-t-gray-950" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Access restricted to authorized personnel
        </p>
      </div>
    </div>
  );
}
