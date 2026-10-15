// BF_CLIENT_v811_APP_USAGE - anonymous usage counts for the staff portal's Marketing > Mobile apps report: how many
// people open the app on iPhone, iPad, Android or the web, sign in, start and submit applications, upload documents
// and finish forms. Each event carries only the event name, platform, device type, app version and a random install
// id (no name, phone, email or application id). Sent to BF-Server's own /api/analytics; never to Google, Clarity or
// ads, and it never blocks or slows the app (fire-and-forget, failures ignored).
import { ENV } from "@/env";

export type UsageEvent =
  | "open" | "sign_in" | "application_started" | "application_submitted" | "document_uploaded" | "form_submitted";
export type Device = "iphone" | "ipad" | "android" | "android_tablet" | "web";

const INSTALL_KEY = "bf_app_install_id";
let memoryId: string | null = null;

function randomId(): string {
  try { if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID(); } catch { /* fall through */ }
  return "i" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function installId(): string {
  try {
    const have = localStorage.getItem(INSTALL_KEY);
    if (have) return have;
    const made = randomId();
    localStorage.setItem(INSTALL_KEY, made);
    return made;
  } catch {
    memoryId = memoryId ?? randomId();
    return memoryId;
  }
}

// iPad and Android tablets are told apart by screen size, because the app is the same build on phone and tablet.
export function deviceFor(platform: string, ua: string, shortSide: number): Device {
  if (platform === "ios") return /iPad/i.test(ua) || shortSide >= 744 ? "ipad" : "iphone";
  if (platform === "android") return shortSide >= 600 ? "android_tablet" : "android";
  return "web";
}

type Info = { platform: "ios" | "android" | "web"; device: Device; version: string };
let infoPromise: Promise<Info> | null = null;

async function readInfo(): Promise<Info> {
  let platform: Info["platform"] = "web";
  let version = String(import.meta.env.VITE_APP_BUILT_AT ?? "").slice(0, 10) || "web";
  try {
    const { Capacitor } = await import("@capacitor/core");
    const p = Capacitor.getPlatform();
    platform = p === "ios" || p === "android" ? p : "web";
    if (platform !== "web") {
      const { App } = await import("@capacitor/app");
      const i = await App.getInfo();
      version = `${i.version} (${i.build})`;
    }
  } catch { /* web, or the native bridge is not ready: keep the defaults */ }
  const short = typeof window !== "undefined" ? Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0) : 0;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return { platform, device: deviceFor(platform, ua, short), version };
}

export function appInfo(): Promise<Info> {
  infoPromise = infoPromise ?? readInfo();
  return infoPromise;
}

export function usageUrl(): string {
  return String(ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "") + "/api/analytics";
}

export async function sendUsage(event: UsageEvent, extra: Record<string, string> = {}): Promise<void> {
  try {
    const i = await appInfo();
    await fetch(usageUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ event: "app_" + event, properties: { platform: i.platform, device: i.device, version: i.version, install_id: installId(), ...extra } }),
    });
  } catch { /* usage counts must never affect the app */ }
}

/** Fire-and-forget: record one usage event. */
export function trackUsage(event: UsageEvent, extra: Record<string, string> = {}): void {
  void sendUsage(event, extra);
}

// An "open" is counted when the app starts and when it comes back to the foreground, at most once per 30 minutes.
const OPEN_KEY = "bf_app_last_open";
export const OPEN_GAP_MS = 30 * 60 * 1000;
export function trackOpen(now = Date.now()): boolean {
  let last = 0;
  try { last = Number(sessionStorage.getItem(OPEN_KEY) ?? 0); } catch { last = 0; }
  if (now - last < OPEN_GAP_MS) return false;
  try { sessionStorage.setItem(OPEN_KEY, String(now)); } catch { /* storage blocked: counted anyway */ }
  trackUsage("open");
  return true;
}
