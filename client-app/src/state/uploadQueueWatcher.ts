// BF_UPLOAD_QUEUE_v51 — drains the IndexedDB upload queue on boot, on `online`,
// and on a 30s interval while the queue is non-empty. Mirrors pendingSubmit.ts.
import { processQueue, queueLength } from "../lib/uploadQueue";

const RETRY_INTERVAL_MS = 30_000;

let timer: ReturnType<typeof setInterval> | null = null;
let started = false;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  running = true;
  try {
    const len = await queueLength();
    if (len > 0) await processQueue();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug("[upload-queue] tick failed", err);
  } finally {
    running = false;
  }
}

export function startUploadQueueWatcher(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  started = true;
  void tick(); // boot drain
  window.addEventListener("online", () => { void tick(); });
  timer = setInterval(() => { void tick(); }, RETRY_INTERVAL_MS);
}

export function stopUploadQueueWatcher(): void {
  if (timer) { clearInterval(timer); timer = null; }
  started = false;
}

// Test-only seam.
export const __internal = { tick, isStarted: () => started };
