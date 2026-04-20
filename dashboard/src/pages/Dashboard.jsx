import { useCallback, useRef, useState, useEffect } from "react";
import { useAuthStore } from "../hooks/useAuth.js";
import { useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEYS,
  useMatches,
  useSimulatorStatus,
  useStopAllSimulators,
} from "../hooks/useMatches.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { MatchCard } from "../components/MatchCard.jsx";
import { MatchForm } from "../components/MatchForm.jsx";

const STATUS_FILTERS = ["all", "live", "scheduled", "finished"];

const FILTER_STYLES = {
  active: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  inactive: "text-gray-500 hover:text-gray-300",
};

// ============== Icons ===============

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function StopAllIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <rect x="2" y="2" width="5" height="12" rx="1" />
      <rect x="9" y="2" width="5" height="12" rx="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

// ============  Main Component =======================

export default function Dashboard() {
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  // Last commentary message per match, from WebSocket
  const [liveCommentary, setLiveCommentary] = useState({}); // { [matchId]: string }

  const logout = useAuthStore.getState().logout;
  const username = useAuthStore((state) => state.username);

  const queryClient = useQueryClient();

  const { data: matches = [], isLoading, isError } = useMatches();
  const { data: simStatus } = useSimulatorStatus();
  const stopAllMutation = useStopAllSimulators();

  // IDs of matches with a running simulator process
  const activeMatchIds = simStatus?.activeMatchIds ?? new Set();

  // Track which match IDs we've already subscribed to avoid duplicate subs
  const subscribedRef = useRef(new Set());

  // WebSocket: receive real-time commentary and match_created events
  const handleWsMessage = useCallback(
    (msg) => {
      if (msg.type === "commentary") {
        const { matchId, message } = msg.data;
        setLiveCommentary((prev) => ({ ...prev, [matchId]: message }));
      }

      if (msg.type === "match_created") {
        // A new match was broadcast - refetch the list
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.matches });
      }
    },
    [queryClient],
  );

  const { subscribe } = useWebSocket(handleWsMessage);

  const liveMatchIds = matches
    .filter((match) => match.status === "live")
    .map((match) => match.id);

  useEffect(() => {
    for (const matchId of liveMatchIds) {
      if (!subscribedRef.current.has(matchId)) {
        subscribe(matchId);
        subscribedRef.current.add(matchId);
      }
    }
  }, [liveMatchIds.join(","), subscribe]);

  // Filter matches by selected tab
  const visibleMatches =
    filter === "all" ? matches : matches.filter((m) => m.status === filter);

  const liveCount = matches.filter((m) => m.status === "live").length;
  const scheduledCount = matches.filter((m) => m.status === "scheduled").length;
  const finishedCount = matches.filter((m) => m.status === "finished").length;

  const countFor = {
    all: matches.length,
    live: liveCount,
    scheduled: scheduledCount,
    finished: finishedCount,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-gray-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4M7 8h2m4 0h2M12 8v4" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Sportz</span>
            {simStatus?.active && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 ring-1 ring-emerald-500/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {simStatus.activeSimulations} simulating
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:block">
              {username}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition cursor-pointer hover:border-white/20 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/*  Page title + actions  */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Matches</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {matches.length} total - {countFor.live} live
            </p>
          </div>

          <div className="flex gap-2">
            {simStatus?.active && (
              <button
                onClick={() => stopAllMutation.mutate()}
                disabled={stopAllMutation.isPending}
                className="flex items-center gap-2 cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {stopAllMutation.isPending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <StopAllIcon />
                )}{" "}
                Stop all
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-gray-950 transition cursor-pointer hover:bg-emerald-400"
            >
              <PlusIcon />
              New Match
            </button>
          </div>
        </div>

        {/*  Filter tabs  */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize cursor-pointer transition ${filter === f ? FILTER_STYLES.active : FILTER_STYLES.inactive}`}
            >
              {f}
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-xs tabular-nums">
                {countFor[f]}
              </span>
            </button>
          ))}
        </div>

        {/*  Match grid  */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            Failed to load matches. Check your connection and try again.
          </div>
        )}

        {!isLoading && !isError && visibleMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500">
              No {filter === "all" ? "" : filter} matches yet.
            </p>
            {filter === "all" && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-sm text-emerald-500 cursor-pointer hover:text-emerald-400"
              >
                Create your first match →
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMatches.map((match) => (
            <div key={match.id}>
              <MatchCard
                match={match}
                isSimulating={activeMatchIds.has(match.id)}
              />

              {/*  Live commentary ticker - shows last event from WS  */}
              {liveCommentary[match.id] && match.status === "live" && (
                <p className="mt-1.5 truncate px-1 text-xs text-gray-500">
                  <span className="mr-1 text-emerald-500">▸</span>
                  {liveCommentary[match.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>

      {/*  New match modal  */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">New match</h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-gray-500 transition hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
            <MatchForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
