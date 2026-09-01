const FALLBACK_ROUTE = "/portal";

/** Converts every native URL source (custom links, app links and push data) to a safe in-app route. */
export function parseNativeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return FALLBACK_ROUTE;
  try {
    const url = new URL(value);
    if (url.protocol !== "borealclient:") return FALLBACK_ROUTE;
    const parts = [url.hostname, ...url.pathname.split("/")].filter(Boolean);
    const [destination, id, ...extra] = parts;
    if (extra.length) return FALLBACK_ROUTE;
    switch (destination) {
      case "home": return FALLBACK_ROUTE;
      case "application": return id ? `/application/${encodeURIComponent(decodeURIComponent(id))}` : "/apply";
      // These are real surfaces in the portal; the section hint lets the portal focus them later
      // without manufacturing parallel routes or screens.
      case "documents":
      case "offers":
      case "messages": return `/portal?section=${destination}`;
      default: return FALLBACK_ROUTE;
    }
  } catch {
    return FALLBACK_ROUTE;
  }
}
