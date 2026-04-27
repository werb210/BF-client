// BF_LOCAL_FIRST_v35 — Block 35: pending-submit outbox.
// When a Step 6 submit fails for any reason (offline, server 5xx, etc.),
// the full payload is persisted here. The wizard auto-retries on browser
// `online` events, on a 30s interval while pending, and on next app boot.
// Once a retry succeeds, the entry is cleared.

import { ClientAppAPI } from "../api/clientApp";

const STORAGE_KEY = "bf_pending_submit";
const RETRY_INTERVAL_MS = 30_000;

type PendingEntry = {
  applicationToken: string;
  body: unknown;
  createdAt: number;
  attempts: number;
};

export function savePendingSubmit(applicationToken: string, body: unknown): void {
  try {
    const entry: PendingEntry = {
      applicationToken,
      body,
      createdAt: Date.now(),
      attempts: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {}
}

export function readPendingSubmit(): PendingEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingEntry;
  } catch {
    return null;
  }
}

export function clearPendingSubmit(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function hasPendingSubmit(): boolean {
  return readPendingSubmit() !== null;
}

async function attemptOnce(): Promise<boolean> {
  const entry = readPendingSubmit();
  if (!entry) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    entry.attempts += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    await ClientAppAPI.submit(entry.applicationToken, entry.body as any);
    clearPendingSubmit();
    console.info("[pending-submit] retry succeeded", { attempts: entry.attempts });
    return true;
  } catch (err) {
    console.debug("[pending-submit] retry failed; will try again", err);
    return false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

export function startPendingSubmitWatcher(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  started = true;
  // Boot-time attempt.
  void attemptOnce();
  // Retry whenever the browser regains connectivity.
  window.addEventListener("online", () => { void attemptOnce(); });
  // Retry on an interval while a pending entry exists.
  timer = setInterval(() => {
    if (hasPendingSubmit()) void attemptOnce();
  }, RETRY_INTERVAL_MS);
}

export function stopPendingSubmitWatcher(): void {
  if (timer) { clearInterval(timer); timer = null; }
  started = false;
}
