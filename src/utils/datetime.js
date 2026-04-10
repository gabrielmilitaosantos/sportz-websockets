const BRAZIL_TZ = "America/Sao_Paulo";

/**
 * Safely coerces a value to a Date.
 * Returns null if the value is invalid.
 */
function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Returns the date as a UTC ISO string (e.g. "2026-04-09T19:00:00.000Z").
 * Always store/transfer dates in UTC — let the client format for their timezone.
 */
export function toUtcISOString(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

// Example output: "09/04/2026, 16:00:00"
export function toBrazilDateTime(value) {
  const date = toDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Serializes a match record for API responses.
 * - All times are returned as UTC ISO strings (safe for JSON/front-end parsing).
 * - Brazil-formatted fields are added for convenient display without client-side conversion.
 *
 * Front-end usage:
 *   match.startTime        → UTC ISO string  (use with `new Date()` or date libraries)
 *   match.startTimeBrazil  → "09/04/2026, 19:00:00" (ready to display in pt-BR)
 */
export function serializeMatchTimes(match) {
  return {
    ...match,
    startTime: toUtcISOString(match.startTime),
    endTime: toUtcISOString(match.endTime),
    createdAt: toUtcISOString(match.createdAt),
    // Convenience fields for Brazilian timezone display
    startTimeBrazil: toBrazilDateTime(match.startTime),
    endTimeBrazil: toBrazilDateTime(match.endTime),
  };
}
