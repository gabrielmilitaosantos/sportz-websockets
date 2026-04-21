import { apiFetch } from "./api.js";

// ========== Matches ================

export function getMatches(limit = 100) {
  return apiFetch(`/matches?limit=${limit}`);
}

export function createMatch(payload) {
  return apiFetch("/matches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateScore(matchId, { homeScore, awayScore }) {
  return apiFetch(`/matches/${matchId}/score`, {
    method: "PATCH",
    body: JSON.stringify({ homeScore, awayScore }),
  });
}

// ========== Simulator =====================

export function getSimulatorStatus() {
  return apiFetch("/simulator/status");
}

export function startSimulator(matchId) {
  return apiFetch(`/simulator/start/${matchId}`, {
    method: "POST",
  });
}

export function stopSimulator(matchId) {
  return apiFetch(`/simulator/stop/${matchId}`, {
    method: "POST",
  });
}

export function stopAllSimulators() {
  return apiFetch("/simulator/stop-all", {
    method: "POST",
  });
}
