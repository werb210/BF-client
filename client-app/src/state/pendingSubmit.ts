// BF_LOCAL_FIRST_v35 — Block 35: pending-submit outbox.
// BF_CLIENT_BLOCK_v316_SUBMIT_RETRY_UX_v1 — added pubsub so the UI can
// show retry status and auto-navigate on success without polling.

import { ClientAppAPI } from "../api/clientApp";

const STORAGE_KEY = "bf_pending_submit";
const RETRY_INTERVAL_MS = 30_000;

type PendingEntry = {
  applicationToken: string;
  body: unknown;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string | null;
};

export type RetryState = {
  pending: boolean;
  attempts: number;
  createdAt: number | null;
  lastAttemptAt: number | null;
  lastError: string | null;
  inFlight: boolean;
};

export type RetryEvent =
  | { type: "queued"; entry: PendingEntry }
  | { type: "attempt_started"; entry: PendingEntry }
  | { type: "attempt_failed"; entry: PendingEntry; error: string }
  | { type: "succeeded"; applicationToken: string }
  | { type: "cleared" };

type Listener = (e: RetryEvent) => void;
const listeners = new Set<Listener>();
let inFlight = false;

function emit(e: RetryEvent): void {
  for (const l of listeners) {
    try { l(e); } catch { /* noop */ }
  }
}

export function subscribeRetry(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function savePendingSubmit(applicationToken: string, body: unknown): void {
  try {
    const entry: PendingEntry = {
      applicationToken,
      body,
      createdAt: Date.now(),
      attempts: 0,
      lastAttemptAt: undefined,
      lastError: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    emit({ type: "queued", entry });
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
    emit({ type: "cleared" });
  } catch {}
}

export function hasPendingSubmit(): boolean {
  return readPendingSubmit() !== null;
}

export function getRetryState(): RetryState {
  const entry = readPendingSubmit();
  return {
    pending: entry !== null,
    attempts: entry?.attempts ?? 0,
    createdAt: entry?.createdAt ?? null,
    lastAttemptAt: entry?.lastAttemptAt ?? null,
    lastError: entry?.lastError ?? null,
    inFlight,
  };
}

async function attemptOnce(): Promise<boolean> {
  const entry = readPendingSubmit();
  if (!entry) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (inFlight) return false;
  inFlight = true;
  try {
    entry.attempts += 1;
    entry.lastAttemptAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    emit({ type: "attempt_started", entry });
    await ClientAppAPI.submit(entry.applicationToken, entry.body as any);
    emit({ type: "succeeded", applicationToken: entry.applicationToken });
    clearPendingSubmit();
    console.info("[pending-submit] retry succeeded", { attempts: entry.attempts });
    return true;
  } catch (err: any) {
    const msg = err?.message || err?.body?.message || String(err);
    try {
      const current = readPendingSubmit();
      if (current) {
        current.lastError = msg;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    } catch {}
    emit({ type: "attempt_failed", entry, error: msg });
    console.debug("[pending-submit] retry failed; will try again", err);
    return false;
  } finally {
    inFlight = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

export function startPendingSubmitWatcher(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  started = true;
  void attemptOnce();
  window.addEventListener("online", () => { void attemptOnce(); });
  timer = setInterval(() => {
    if (hasPendingSubmit()) void attemptOnce();
  }, RETRY_INTERVAL_MS);
}

export function stopPendingSubmitWatcher(): void {
  if (timer) { clearInterval(timer); timer = null; }
  started = false;
}

/** Trigger an immediate retry (used by the "Try now" UI button). */
export function triggerImmediateRetry(): Promise<boolean> {
  return attemptOnce();
}
