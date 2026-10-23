// BF_CLIENT_v851_APPLICANT_NAME - the OTP placeholder is never an applicant's name.
//
// When an applicant verifies their phone, BF-Server creates their CRM contact as "Unknown" "(application started)".
// The readiness prefill handed that back as the applicant's name and Step 4 wrote it over what the applicant typed, so
// applications (and signing) went out as "Unknown (application started)". Prefill now only fills EMPTY fields and
// never uses a placeholder name.

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** True for "Unknown", "(application started)" and "Unknown (application started)" (any case/spacing). */
export function isPlaceholderName(value: unknown): boolean {
  const s = clean(value).toLowerCase();
  if (!s) return false;
  if (s.includes("(application started)")) return true;
  return s === "unknown" || s === "unknown unknown";
}

/** A real name from a prefill, or undefined when it is empty or the placeholder. */
export function prefillName(value: unknown): string | undefined {
  const s = clean(value);
  return s && !isPlaceholderName(s) ? s : undefined;
}

/** First / last from a full name: "Jordan P Rivers" -> "Jordan", "P Rivers". */
export function splitName(full: string | undefined): { first: string; last: string } {
  const parts = clean(full).split(" ").filter(Boolean);
  const first = parts.shift() ?? "";
  return { first, last: parts.join(" ") };
}

/**
 * Fill a name field from a prefill. What the applicant typed always wins. A current value that is the placeholder
 * counts as empty, and is cleared when the prefill has no real name. Otherwise the current value is returned as is.
 */
export function fillName(current: string | undefined, incoming: unknown): string | undefined {
  if (clean(current) && !isPlaceholderName(current)) return current;
  const next = prefillName(incoming);
  if (next) return next;
  return isPlaceholderName(current) ? "" : current;
}

/** Fill a non-name field (email, phone) only when it is empty. */
export function fillEmptyText(current: string | undefined, incoming: unknown): string | undefined {
  if (clean(current)) return current;
  const next = clean(incoming);
  return next || current;
}
