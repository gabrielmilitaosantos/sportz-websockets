import { useStartSimulator, useStopSimulator } from "../hooks/useMatches.js";

const STATUS_STYLES = {
  live: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  scheduled: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30",
  finished: "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/30",
};

const STATUS_DOT = {
  live: "bg-emerald-400 animate-pulse",
  scheduled: "bg-sky-400",
  finished: "bg-gray-500",
};

const SPORT_ICON = {
  football: "⚽",
  soccer: "⚽",
  basketball: "🏀",
  cricket: "🏏",
};

// ============= Small helpers ==========
function formatUtc(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M5 3.5 L13 8 L5 12.5 Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

// ============= Component function ==============================
export function MatchCard({ match, isSimulating }) {
  const startMutation = useStartSimulator();
  const stopMutation = useStopSimulator();

  const isLive = match.status === "live";
  const isScheduled = match.status === "scheduled";
  const isFinished = match.status === "finished";
  const isPending = startMutation.isPending || stopMutation.isPending;

  // Start button is available for any live match that isn't currently simulating
  const canStart = isLive && !isSimulating;
  const canStop = isLive && isSimulating;

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:border-white/10 hover:bg-white/[0.07]">
      {/* Header row: sport icon + teams + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl" role="img" aria-label={match.sport}>
            {SPORT_ICON[match.sport?.toLowerCase()] ?? "🏆"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {match.homeTeam}
              <span className="mx-1.5 font-normal text-gray-500">vs</span>
              {match.awayTeam}
            </p>
            <p className="mt-0.5 text-xs capitalize text-gray-500">
              {match.sport}
            </p>
          </div>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[match.status] ?? STATUS_STYLES.finished}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[match.status] ?? STATUS_DOT.finished}`}
          />
          {match.status}
        </span>
      </div>

      {/* Score - only meaningful when live or finished */}
      {(isLive || isFinished) && (
        <div className="flex items-center justify-center gap-4 rounded-xl bg-white/5 py-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 truncate max-w-20">
              {match.homeTeam}
            </p>
            <p className="text-3xl font-bold tabular-nums text-white">
              {match.homeScore ?? 0}
            </p>
          </div>
          <span className="text-lg font-light text-gray-600">-</span>
          <div className="text-center">
            <p className="text-xs text-gray-500 truncate max-w-20">
              {match.awayTeam}
            </p>
            <p className="text-3xl font-bold tabular-nums text-white">
              {match.awayScore ?? 0}
            </p>
          </div>
        </div>
      )}

      {/*  Times  */}
      <div className="flex flex-col gap-1 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Start</span>
          <span className="text-gray-400">
            {match.startTimeBrazil ?? formatUtc(match.startTime)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>End</span>
          <span className="text-gray-400">
            {match.endTimeBrazil ?? formatUtc(match.endTime)}
          </span>
        </div>
      </div>

      {/* Simulator controls — hidden for finished matches */}
      {!isFinished && (
        <div className="flex gap-2 border-t border-white/5 pt-4">
          {canStop ? (
            <button
              onClick={() => stopMutation.mutate(match.id)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stopMutation.isPending ? <Spinner /> : <StopIcon />}
              Stop simulation
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate(match.id)}
              disabled={isPending || !canStart}
              title={!isLive ? "Match hasn't started yet" : undefined}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startMutation.isPending ? <Spinner /> : <PlayIcon />}
              Start simulation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
