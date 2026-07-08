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

type JourneyEvent = { type: string; path?: string; step?: string; dwellMs?: number; meta?: unknown };

export function trackJourney(event: JourneyEvent): void {
  try {
    const sessionId = getJourneySessionId();
    if (!sessionId) return;
    const json = JSON.stringify({ sessionId, events: [event] });
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
