import { useState } from "react";
import { useCreateMatch } from "../hooks/useMatches.js";

const SPORTS = ["football", "basketball", "cricket"];

// Returns a datetime-local string adjusted to Brazil timezone (UTC-3)
// so the <input type="datetime-local"> shows local time, not UTC.
function toBrazilLocalInput(date = new Date()) {
  const offset = -3 * 60; // America/Sao_Paulo offset in minutes

  const local = new Date(
    date.getTime() + offset * 60_000 - date.getTimezoneOffset() * 60_000,
  );
  return local.toISOString().slice(0, 16);
}

// Converts the datetime-local value to UTC ISO string
function brazilInputToUtcIso(localStr) {
  // localStr = "YYYY-MM-DDTHH:mm"
  return new Date(`${localStr}:00-03:00`).toISOString();
}

const INITIAL_STATE = {
  sport: "football",
  homeTeam: "",
  awayTeam: "",
  startTime: toBrazilLocalInput(),
  endTime: toBrazilLocalInput(new Date(Date.now() + 2 * 60 * 60_000)), // +2 default
};

export function MatchForm({ onClose }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [validationError, setValidationError] = useState(null);
  const { mutate, isPending, error, reset } = useCreateMatch();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) reset(); // clear previous error when user starts typing
    if (validationError) setValidationError(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const startMs = new Date(brazilInputToUtcIso(form.startTime)).getTime();
    const endMs = new Date(brazilInputToUtcIso(form.endTime)).getTime();
    if (endMs <= startMs) {
      setValidationError("End time must be after start time.");
      return;
    }

    mutate(
      {
        sport: form.sport,
        homeTeam: form.homeTeam.trim(),
        awayTeam: form.awayTeam.trim(),
        startTime: brazilInputToUtcIso(form.startTime),
        endTime: brazilInputToUtcIso(form.endTime),
      },
      {
        onSuccess: () => {
          onClose?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/*  Sport  */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">Sport</label>
        <select
          name="sport"
          value={form.sport}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        >
          {SPORTS.map((s) => (
            <option key={s} value={s} className="bg-gray-900 capitalize">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/*  Teams  */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Home team
          </label>
          <input
            name="homeTeam"
            value={form.homeTeam}
            onChange={handleChange}
            required
            placeholder="e.g Barcelona"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Away team
          </label>
          <input
            name="awayTeam"
            value={form.awayTeam}
            onChange={handleChange}
            required
            placeholder="e.g Real Madrid"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/*  Times - displayed and entered in Brazil timezone  */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Start time <span className="text-xs text-gray-500">(Brasília)</span>
          </label>
          <input
            type="datetime-local"
            name="startTime"
            value={form.startTime}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 scheme-dark"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">
            End time <span className="text-xs text-gray-500">(Brasília)</span>
          </label>
          <input
            type="datetime-local"
            name="endTime"
            value={form.endTime}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 scheme-dark"
          />
        </div>
      </div>

      {(validationError || error) && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          {validationError ?? error.message}
        </p>
      )}

      {/*  Actions  */}
      <div className="flex justify-end gap-3 border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-white cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg  bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 transition cursor-pointer hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-950/30 border-t-gray-950" />
          )}
          {isPending ? "Creating..." : "Create match"}
        </button>
      </div>
    </form>
  );
}
