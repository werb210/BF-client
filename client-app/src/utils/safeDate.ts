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

// BF_CLIENT_BLOCK_v546 - message timestamps. A time alone ("6:48 PM" above
// "1:36 PM") reads as out of order when the messages are days apart. Today shows
// the time; any other day adds the date; another year adds the year.
export function formatMessageTime(value: unknown, now: Date = new Date()): string {
  const d = safeParseDate(value);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  const date = d.toLocaleDateString([], d.getFullYear() === now.getFullYear()
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
  return `${date}, ${time}`;
}
