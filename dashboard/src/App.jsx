import { useAuthStore } from "./hooks/useAuth.js";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./router/PrivateRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const initialize = useAuthStore.getState().initialize;

  // On first render, check if there's a stored token that's still valid.
  // This runs once — keeps the user logged in across page refreshes.
  useEffect(() => {
    initialize().catch((error) => console.log("Initialize error:", error));
  }, [initialize]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>

      {/*Catch-all redirect unknown path to home*/}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
