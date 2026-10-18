// v131-bootstrap
// One place that starts every native runtime concern: push listeners and the
// background upload queue. Called once from the app entry. Every dependency
// is resolved lazily and defensively—a missing token or unavailable plugin
// degrades to a no-op rather than breaking app start.

import { Capacitor } from "@capacitor/core";
import { getToken as getSessionToken } from "@/auth/token";

export type RuntimeStatus = {
  uploadQueue: boolean;
  push: boolean;
  errors: string[];
};

let started = false;
let stopFns: Array<() => void> = [];
// BF_CLIENT_v817 - the APNs/FCM token from the last "registration" event, kept so it can be sent again
// once the client signs in (the event fires at app start, usually before there is a session).
let lastDeviceToken: string | null = null;
let sessionTokenSource: () => string | null = defaultSessionToken;
// BF_CLIENT_v823_NOTIFICATIONS - sign-out stops the runtime (push listeners off, device unregistered). It is started
// again with the same options at the next sign-in, so push works without restarting the app.
let lastStartOptions: StartOptions | null = null;

/** Candidate storage keys, most specific first. */
const TOKEN_KEYS = ["bf_jwt_token", "boreal.token", "auth_token", "authToken", "token", "jwt", "access_token"];

export function readToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value && value.length > 10) return value.replace(/^"|"$/g, "");
    } catch {
      // Storage can throw in private mode; try the next key.
    }
  }
  return null;
}

// BF_CLIENT_v817 - on iOS/Android the session lives in the Keychain-backed auth/token store, never in
// localStorage, so readToken() alone was always null in the app: every push-token registration went out
// without Authorization, BF-Server answered 401, no device was ever on file and notices fell back to SMS.
export function defaultSessionToken(): string | null {
  try {
    const session = getSessionToken();
    if (session) return session;
  } catch {
    // fall through to the legacy keys
  }
  return readToken();
}

/** BF_CLIENT_v817 - sends the device push token to BF-Server. True only when the server stored it. */
export async function postDeviceToken(deviceToken: string, getToken: () => string | null = sessionTokenSource): Promise<boolean> {
  lastDeviceToken = deviceToken;
  const auth = getToken();
  if (!auth) return false; // not signed in yet; syncPushRegistration() sends it after sign-in
  try {
    // BF_CLIENT_PUSH_ACTIONS_v144 — the route is /api/push/register-token (the bare /register path
    // does not exist and silently 404'd every registration), and the server selects APNs vs FCM off
    // `platform`, so it has to be the real platform, not "capacitor".
    const response = await fetch(resolveBaseUrl() + "/api/push/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth },
      body: JSON.stringify({ token: deviceToken, platform: devicePlatform() }),
    });
    return Boolean(response?.ok);
  } catch {
    return false; // retried on the next sign-in or app start
  }
}

/** BF_CLIENT_v823_NOTIFICATIONS - after a sign-in: restart push if sign-out stopped it, then register the token. */
export async function resumeAfterSignIn(): Promise<boolean> {
  if (!started && lastStartOptions) {
    await startBorealRuntime(lastStartOptions); // re-registers; the "registration" event posts the new token
    return true;
  }
  return syncPushRegistration();
}

/** BF_CLIENT_v817 - called after sign-in: registers the device token captured before there was a session. */
export async function syncPushRegistration(): Promise<boolean> {
  if (!lastDeviceToken) return false;
  return postDeviceToken(lastDeviceToken);
}

/** Test seam. */
export function __setLastDeviceToken(value: string | null): void {
  lastDeviceToken = value;
}

export function resolveBaseUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const candidates = [env.VITE_API_URL, env.VITE_SERVER_URL, env.VITE_API_BASE_URL, env.VITE_BF_SERVER_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) return candidate.replace(/\/+$/, "");
  }
  return "https://server.boreal.financial";
}

/** Turns a stored fileRef into a Blob, including native filesystem paths. */
export async function readFileRef(fileRef: string): Promise<Blob> {
  const ref = String(fileRef || "");
  if (!ref) throw new Error("empty fileRef");

  if (ref.startsWith("data:") || ref.startsWith("blob:") || ref.startsWith("http")) {
    const response = await fetch(ref);
    if (!response.ok) throw new Error("could not read " + ref.slice(0, 40));
    return response.blob();
  }

  const { Filesystem } = await import("@capacitor/filesystem");
  const { data } = await Filesystem.readFile({ path: ref });
  if (typeof data !== "string") return data;

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes]);
}

export type StartOptions = {
  navigate?: (route: string) => void;
  onQueueChange?: (pending: number) => void;
  getToken?: () => string | null;
};

/**
 * The concrete platform the server needs to pick a push transport. Capacitor
 * reports "ios" / "android" / "web"; anything else is reported as-is so a
 * surprise value shows up in the data rather than being silently coerced.
 */
export function devicePlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
}

export async function startBorealRuntime(options: StartOptions = {}): Promise<RuntimeStatus> {
  const status: RuntimeStatus = { uploadQueue: false, push: false, errors: [] };
  if (started) return status;
  started = true;
  lastStartOptions = options; // BF_CLIENT_v823_NOTIFICATIONS
  const getToken = options.getToken || defaultSessionToken; // BF_CLIENT_v817 - was readToken (null in the app)
  sessionTokenSource = getToken;

  // v136: the upload queue is owned by BF_UPLOAD_QUEUE_v51
  // (src/lib/uploadQueue + src/state/uploadQueueWatcher), which main.tsx already
  // starts and Step5_Documents already enqueues into. Starting a second queue here
  // meant two drains on the same "online" and interval triggers, risking duplicate
  // uploads of the same document. This runtime now owns push listeners only.

  try {
    const { installPushListeners } = await import("./pushListener");
    const installed = await installPushListeners({
      navigate: options.navigate,
      onRegistrationToken: async (token) => {
        await postDeviceToken(token, getToken);
      },
      onError: (error) => status.errors.push("push: " + String(error)),
    });
    status.push = installed === true;
  } catch (error) {
    status.errors.push("push unavailable: " + String(error));
  }

  return status;
}

export function stopBorealRuntime(): void {
  stopFns.forEach((stop) => {
    try {
      stop();
    } catch {
      // Best-effort teardown.
    }
  });
  stopFns = [];
  started = false;
  lastDeviceToken = null; // BF_CLIENT_v817 - a signed-out device must not re-register for the next person
  sessionTokenSource = defaultSessionToken;
}
