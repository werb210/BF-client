// BF_CLIENT_v789_SIGN_OUT_WIPE
// Sign-out used to clear the session token and nothing else. The application
// token, the saved client profiles, step drafts, the pending-submit outbox, the
// queued uploads and the service worker's API cache all stayed on the device, so
// the next person to pick up a shared phone or computer could read them. This is
// the one place that ends a session, and it removes all of it.
import { ClientProfileStore } from "../state/clientProfiles";
import { OfflineStore } from "../state/offline";
import { clearPendingSubmit } from "../state/pendingSubmit";
import { clearStoredApplication } from "../state/useApplicationStore";
import { clearAllApplicationDrafts } from "../state/validateBootToken";
import { clearDraft } from "../client/autosave";
import { clearSubmissionIdempotencyKey } from "../client/submissionIdempotency";
import { clearToken, flushTokenWrites } from "@/auth/token";
import { clearApplicationToken, flushApplicationTokenWrites } from "@/auth/applicationToken";
import { CONSENT_KEY } from "@/utils/analytics";
import { clearConversation } from "@/components/mayaConversation";

/** IndexedDB queues holding documents and form answers waiting to upload. */
export const OUTBOX_DATABASES = ["bf-upload-queue", "bf-form-response-queue"] as const;

const CLEAR_CACHES_TIMEOUT_MS = 3000;

/** Ask the service worker to delete every cache, and wait (briefly) for it. */
export async function requestServiceWorkerCacheClear(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = registration?.active ?? navigator.serviceWorker.controller;
    if (!worker) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, CLEAR_CACHES_TIMEOUT_MS);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = done;
        worker.postMessage({ type: "CLEAR_CACHES" }, [channel.port2]);
      } catch {
        worker.postMessage({ type: "CLEAR_CACHES" });
        done();
      }
    });
  } catch {
    // No worker to ask; clearBrowserCaches below still runs.
  }
}

/** Delete every Cache Storage entry from the page as well, in case the worker is gone. */
export async function clearBrowserCaches(): Promise<void> {
  if (!("caches" in globalThis)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // ignore cache clear failures
  }
}

/** Drop the upload and form-response outboxes. */
export async function clearOutbox(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await Promise.all(
    OUTBOX_DATABASES.map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          } catch {
            resolve();
          }
        })
    )
  );
}

/**
 * Synchronous part of the wipe: tokens, saved profiles, drafts, the pending
 * submit and every other key this app wrote to localStorage/sessionStorage.
 */
export function clearClientStorage(): void {
  // BF_CLIENT_BACKGROUND_UPLOAD_v307 - signing out stops phone-managed uploads.
  void import("@/native/backgroundUpload").then((module) => module.cancelBackgroundUploads()).catch((): void => undefined);
  // BF_CLIENT_FACE_ID_SIGN_IN_v297 - signing out turns Face ID sign-in off for this phone.
  void import("@/native/deviceSignIn").then((m) => m.disableDeviceSignIn()).catch((): void => undefined);

  clearToken();
  clearApplicationToken();
  ClientProfileStore.clearAll();
  clearStoredApplication();
  clearAllApplicationDrafts();
  OfflineStore.clear();
  clearDraft();
  clearPendingSubmit();
  clearSubmissionIdempotencyKey();
  clearConversation(); // BF_CLIENT_v789_MAYA_CONVERSATION_TOKEN

  try {
    // The cookie/analytics consent answer is a device preference, not account
    // data; keeping it means the next visitor's choice is not made for them by
    // a banner that never reappears, and a "decline" is not silently lost.
    const consent = localStorage.getItem(CONSENT_KEY);
    localStorage.clear();
    if (consent) localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // storage blocked
  }
  try {
    sessionStorage.clear();
  } catch {
    // storage blocked
  }
}

/**
 * The full sign-out wipe. Resolves once the caches, outbox, push registration
 * and the native Keychain writes have been cleared.
 */
export async function wipeSession(): Promise<void> {
  clearClientStorage();
  await Promise.all([
    requestServiceWorkerCacheClear().then(clearBrowserCaches),
    clearOutbox(),
    import("@/native/pushListener").then((m) => m.unregisterPush()).catch((): void => undefined),
    import("@/native/borealRuntime").then((m) => m.stopBorealRuntime()).catch((): void => undefined),
    flushTokenWrites(),
    flushApplicationTokenWrites(),
  ]);
}

export async function logout(options?: { redirectTo?: string }): Promise<void> {
  const redirectTo = options?.redirectTo ?? "/";
  await wipeSession();
  if (typeof window === "undefined") return;
  window.location.assign(redirectTo);
}
