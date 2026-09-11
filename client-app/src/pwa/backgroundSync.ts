// BF_CLIENT_BACKGROUND_SYNC_v151
// Makes the Background Sync path actually work.

export const BG_SYNC_TAG = "bf-client-bg-sync";
export const BG_SYNC_MESSAGE = "BG_SYNC_TRIGGER";

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

export function supportsBackgroundSync(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof ServiceWorkerRegistration !== "undefined" &&
    "sync" in ServiceWorkerRegistration.prototype
  );
}

/**
 * Asks the browser to fire a sync event once connectivity allows. Safe to call
 * on every enqueue: registering the same tag twice coalesces into one event.
 * Returns false when the browser has no Background Sync, in which case the
 * existing online/interval watcher remains the only drain.
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (!supportsBackgroundSync()) return false;
  try {
    const registration = (await navigator.serviceWorker.ready) as SyncCapableRegistration;
    if (!registration.sync) return false;
    await registration.sync.register(BG_SYNC_TAG);
    return true;
  } catch {
    // A failed registration must never break an upload that would otherwise
    // be drained by the interval watcher.
    return false;
  }
}

/** Listens for the wake-up the service worker sends. Returns an uninstall function. */
export function onBackgroundSyncTrigger(handler: () => void): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => undefined;
  }
  const listener = (event: MessageEvent) => {
    if (event?.data?.type === BG_SYNC_MESSAGE) handler();
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
