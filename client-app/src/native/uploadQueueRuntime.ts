// v130-queue-wiring
// Discovered upload route at build time: /api/client/documents/upload
// Concrete storage + transport for the v129 UploadQueue, plus the triggers
// that drain it: app resume, network recovery, and an interval fallback.
// The endpoint is injected rather than hardcoded so staging and prod differ
// only by config.
import { UploadQueue, type QueueStorage, type Transport, type UploadItem } from "./uploadQueue";

const STORAGE_KEY = "boreal.uploadQueue.v1";

/** Capacitor Preferences provides durable storage on native and web. */
export function createStorage(): QueueStorage {
  return {
    read: async () => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        const got = await Preferences.get({ key: STORAGE_KEY });
        if (!got.value) return [];
        const parsed: unknown = JSON.parse(got.value);
        return Array.isArray(parsed) ? (parsed as UploadItem[]) : [];
      } catch {
        return [];
      }
    },
    write: async (items: UploadItem[]) => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(items) });
      } catch {
        // Storage is best-effort; an in-memory queue still works this session.
      }
    },
  };
}

export type TransportConfig = {
  baseUrl: string;
  route: string;
  getToken: () => string | null;
  /** Resolves a fileRef into a Blob. Native paths need a filesystem read. */
  readFile: (fileRef: string) => Promise<Blob>;
  fetchImpl?: typeof fetch;
};

export class UploadHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UploadHttpError";
    this.status = status;
  }
}

export function resolveRoute(route: string, item: UploadItem): string {
  const applicationId = encodeURIComponent(item.applicationId);
  return route
    .replace(/:applicationId|\{applicationId\}|\$\{applicationId\}/g, applicationId)
    .replace(/:id\b|\{id\}/g, applicationId);
}

export function createTransport(config: TransportConfig): Transport {
  const doFetch = config.fetchImpl ?? fetch;
  return {
    upload: async (item: UploadItem) => {
      const blob = await config.readFile(item.fileRef);
      const form = new FormData();
      form.append("file", blob, item.fileName);
      form.append("documentType", item.documentType);
      form.append("applicationId", item.applicationId);

      const token = config.getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const url = config.baseUrl.replace(/\/+$/, "") + resolveRoute(config.route, item);
      const res = await doFetch(url, { method: "POST", body: form, headers });
      if (!res.ok) {
        let detail = "";
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          detail = res.statusText || "";
        }
        throw new UploadHttpError(res.status, `upload failed ${res.status} ${detail}`);
      }
    },
  };
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export type RuntimeOptions = {
  transport: TransportConfig;
  onChange?: (items: UploadItem[]) => void;
  intervalMs?: number;
};

let singleton: UploadQueue | null = null;
let teardown: (() => void) | null = null;

export function getQueue(options: RuntimeOptions): UploadQueue {
  if (singleton) return singleton;
  singleton = new UploadQueue(createStorage(), createTransport(options.transport), {
    isOnline,
    onChange: options.onChange,
  });
  return singleton;
}

/** Starts all queue drain triggers and returns an uninstall function. */
export function startUploadQueue(options: RuntimeOptions): () => void {
  const queue = getQueue(options);
  const interval = options.intervalMs ?? 60_000;
  const cleanups: Array<() => void> = [];
  let stopped = false;
  const drain = () => {
    if (!stopped) void queue.drain();
  };

  void queue.load().then(drain);

  if (typeof window !== "undefined") {
    window.addEventListener("online", drain);
    cleanups.push(() => window.removeEventListener("online", drain));

    const onVisible = () => {
      if (document.visibilityState === "visible") drain();
    };
    document.addEventListener("visibilitychange", onVisible);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVisible));
  }

  const timer = setInterval(drain, interval);
  cleanups.push(() => clearInterval(timer));

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appStateChange", (state: { isActive: boolean }) => {
        if (state.isActive) drain();
      });
      if (stopped) void handle.remove();
      else cleanups.push(() => void handle.remove());
    } catch {
      // Not native, or plugin unavailable; web triggers already cover it.
    }
  })();

  teardown = () => {
    if (stopped) return;
    stopped = true;
    cleanups.forEach((cleanup) => cleanup());
  };
  return teardown;
}

/** Test seam only. */
export function __resetUploadQueue(): void {
  teardown?.();
  teardown = null;
  singleton = null;
}

/** Route discovered from the existing client code when this block ran. */
export const DISCOVERED_UPLOAD_ROUTE = "/api/client/documents/upload";
