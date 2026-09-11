// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BG_SYNC_TAG,
  BG_SYNC_MESSAGE,
  registerBackgroundSync,
  onBackgroundSyncTrigger,
  supportsBackgroundSync,
} from "../backgroundSync";

const root = path.resolve(__dirname, "../..");

function installServiceWorker(sync: unknown) {
  const listeners: Array<(e: any) => void> = [];
  const sw = {
    ready: Promise.resolve({ sync }),
    addEventListener: (_t: string, fn: (e: any) => void) => listeners.push(fn),
    removeEventListener: (_t: string, fn: (e: any) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    emit: (data: unknown) => listeners.forEach((fn) => fn({ data })),
    listenerCount: () => listeners.length,
  };
  Object.defineProperty(navigator, "serviceWorker", { value: sw, configurable: true });
  (globalThis as any).ServiceWorkerRegistration = function () {};
  (globalThis as any).ServiceWorkerRegistration.prototype = { sync: {} };
  return sw;
}

describe("BF_CLIENT_BACKGROUND_SYNC_v151", () => {
  afterEach(() => {
    delete (globalThis as any).ServiceWorkerRegistration;
    vi.restoreAllMocks();
  });

  it("uses the tag the service worker already listens for", () => {
    expect(BG_SYNC_TAG).toBe("bf-client-bg-sync");
    const sw = fs.readFileSync(path.join(root, "sw.ts"), "utf8");
    expect(sw).toContain(BG_SYNC_TAG);
    expect(sw).toContain(BG_SYNC_MESSAGE);
  });

  it("registers the tag so the event can actually fire", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    installServiceWorker({ register });
    expect(await registerBackgroundSync()).toBe(true);
    expect(register).toHaveBeenCalledWith(BG_SYNC_TAG);
  });

  it("reports unsupported where Background Sync does not exist", async () => {
    Object.defineProperty(navigator, "serviceWorker", { value: undefined, configurable: true });
    expect(supportsBackgroundSync()).toBe(false);
    expect(await registerBackgroundSync()).toBe(false);
  });

  it("reports false rather than throwing when registration is refused", async () => {
    installServiceWorker({ register: vi.fn().mockRejectedValue(new Error("denied")) });
    expect(await registerBackgroundSync()).toBe(false);
  });

  it("reports false when the registration exposes no sync", async () => {
    installServiceWorker(undefined);
    expect(await registerBackgroundSync()).toBe(false);
  });

  it("drains when the worker wakes the page", () => {
    const sw = installServiceWorker({ register: vi.fn() });
    const handler = vi.fn();
    onBackgroundSyncTrigger(handler);
    sw.emit({ type: BG_SYNC_MESSAGE });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated worker messages", () => {
    const sw = installServiceWorker({ register: vi.fn() });
    const handler = vi.fn();
    onBackgroundSyncTrigger(handler);
    sw.emit({ type: "SOMETHING_ELSE" });
    sw.emit(undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it("removes its listener on uninstall", () => {
    const sw = installServiceWorker({ register: vi.fn() });
    const uninstall = onBackgroundSyncTrigger(vi.fn());
    expect(sw.listenerCount()).toBe(1);
    uninstall();
    expect(sw.listenerCount()).toBe(0);
  });

  it("schedules a sync when an upload is queued", () => {
    const src = fs.readFileSync(path.join(root, "lib/uploadQueue.ts"), "utf8");
    expect(src).toContain("scheduleBackgroundSync()");
  });

  it("the watcher registers and subscribes", () => {
    const src = fs.readFileSync(path.join(root, "state/uploadQueueWatcher.ts"), "utf8");
    expect(src).toContain("registerBackgroundSync()");
    expect(src).toContain("onBackgroundSyncTrigger");
  });

  it("the worker no longer treats a missing client as success", () => {
    const sw = fs.readFileSync(path.join(root, "sw.ts"), "utf8");
    expect(sw).toContain("no_client_to_drain_queue");
    expect(sw).toContain("includeUncontrolled");
  });
});
