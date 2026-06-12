// BF_CLIENT_BLOCK_v868_SAFARI_DATE
// Safari (and older Firefox) return "Invalid Date" for the space-separated
// timestamp format Postgres/our API often emit, e.g. "2026-06-12 14:44:00".
// Chrome tolerates it; Safari does not, silently breaking timestamp displays and
// time math (NaN). safeParseDate is a DROP-IN for `new Date(x)`: it converts the
// separating space to an ISO "T" so every browser parses it, and otherwise
// behaves identically (Invalid Date for bad input, so isNaN guards still work).

export function safeParseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string") return new Date(NaN);

  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);

  const iso = trimmed.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:)/, "$1T$2");
  return new Date(iso);
}
