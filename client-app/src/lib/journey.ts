// BF_CLIENT_VISITOR_JOURNEY_v1 - continues the visitor journey inside the wizard.
// Reuses the journey session id handed over from the website (?journeySession=...),
// or mints one, so the CRM can show the full path: which ad -> pages -> wizard steps.
// Beacons to BF-Server. Fails silently; tracking must never break the wizard.
const SESSION_KEY = "boreal_journey_session";
const ENDPOINT = "https://server.boreal.financial/api/track/journey";

export function getJourneySessionId(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    const fromUrl = (p.get("journeySession") || "").trim();
    if (fromUrl) {
      localStorage.setItem(SESSION_KEY, fromUrl);
      return fromUrl;
    }
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

type JourneyEvent = { type: string; path?: string; title?: string; step?: string; dwellMs?: number; meta?: unknown };

export function trackJourney(event: JourneyEvent): void {
  try {
    const sessionId = getJourneySessionId();
    if (!sessionId) return;
    // BF_CLIENT_JOURNEY_BOOT_v185 - the collector accepts an attribution object and uses
    // it to populate visitor_sessions.gclid / utm_*. We were never sending it, so every
    // session row this app created had null attribution and could not be tied to an ad.
    let attribution: Record<string, unknown> = {};
    try {
      const raw = sessionStorage.getItem("bf_attribution");
      if (raw) attribution = JSON.parse(raw) as Record<string, unknown>;
    } catch { /* attribution is best-effort */ }
    const json = JSON.stringify({ sessionId, attribution, events: [event] });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([json], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true }).catch(() => {});
  } catch { /* never break the wizard */ }
}

// Records a wizard step transition, with time spent on the step just left.
export function trackWizardStep(step: number | string, dwellMs?: number): void {
  trackJourney({ type: "wizard_step", step: String(step), dwellMs, path: typeof window !== "undefined" ? window.location.pathname : undefined });
}

export function trackApplicationSubmitted(): void {
  trackJourney({ type: "application_submitted" });
}

// BF_CLIENT_JOURNEY_BOOT_v185
// Two separate bugs meant client.boreal.financial recorded nothing at all:
//
// 1. The journey session id was only minted lazily, inside trackWizardStep. That runs
//    minutes after /api/public/application/start has already posted its attribution, so
//    the sessionId was always absent at start and the server had nothing to stitch. The
//    contact's Visitor Journey panel was empty for every direct arrival.
// 2. Even a minted id was not enough: visitor_sessions rows are only created by a beacon
//    POST. Nothing fired one at boot, so there was no row to stitch to.
//
// startJourney() must be called BEFORE captureAttribution() so the id exists in
// localStorage when attribution is captured, and it fires the beacon that creates the row.
export function startJourney(): void {
  try {
    getJourneySessionId();
    trackJourney({
      type: "session_start",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      title: typeof document !== "undefined" ? document.title : undefined,
    });
  } catch { /* never break the app */ }
}

export function trackJourneyPageview(path: string, title?: string): void {
  trackJourney({ type: "pageview", path, title });
}
