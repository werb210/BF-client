const FALLBACK_ROUTE = "/portal";
// BF_CLIENT_v817 - hosts whose https links the app claims (apple-app-site-association / assetlinks.json).
const APP_LINK_HOSTS = new Set(["client.boreal.financial"]);

/** Converts every native URL source (custom links, app links and push data) to a safe in-app route. */
export function parseNativeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return FALLBACK_ROUTE;
  try {
    const url = new URL(value);
    // BF_CLIENT_v817 - universal links / Android app links: an SMS link to the client portal
    // (https://client.boreal.financial/application/<id>) now opens that screen in the app.
    if (url.protocol === "https:" && APP_LINK_HOSTS.has(url.hostname.toLowerCase())) {
      const path = url.pathname || "/";
      if (!path.startsWith("/") || path.startsWith("//") || path === "/") return FALLBACK_ROUTE;
      return path + url.search;
    }
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
      // BF_CLIENT_v823_QUICK_ACTIONS - the "Book a call" quick action / Android shortcut.
      case "book-call": return "/portal?section=book-call";
      default: return FALLBACK_ROUTE;
    }
  } catch {
    return FALLBACK_ROUTE;
  }
}
