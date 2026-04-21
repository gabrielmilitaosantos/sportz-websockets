import { useAuthStore } from "../hooks/useAuth.js";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Wraps protected routes.
 *
 * - "idle" / "loading": shows a blank screen while the token is being verified
 *   (avoids a flash of the login page for users who are already authenticated).
 * - "unauthenticated": redirects to /login.
 * - "authenticated": renders the child route via <Outlet />.
 */
export function PrivateRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
