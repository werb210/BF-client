// BF_CLIENT_FACE_ID_SIGN_IN_v297
// Face ID sign-in (BF-Server v296). After a text-code sign-in the app can
// enroll: the server returns a device secret, kept in the phone's secure
// storage. Next time Face ID must succeed before that secret is read and
// exchanged for a session. The server rotates the secret on every use.
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { apiRequest } from "@/lib/api";
import { getToken, setToken } from "@/auth/token";
import { namedCredentialStore } from "@/auth/credentialStore";

export const DEVICE_KEY = "device-sign-in";
export const PROMPTED_KEY = "bf_face_id_prompted";

type Stored = { credentialId: string; secret: string };
export type DeviceSignInData = { token: string; secret: string; hasSubmittedApplication?: boolean; submittedApplicationId?: string | null };

export function parseStored(raw: string | null): Stored | null {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.credentialId === "string" && typeof v.secret === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function biometryAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try { return (await BiometricAuth.checkBiometry()).isAvailable; } catch { return false; }
}

// BF_CLIENT_FACE_ID_SETTING_v325
// biometryAvailable() collapses every reason to false, which is why the v324
// toggle - which only rendered when it returned true - could vanish with nothing
// on screen to explain it. This keeps the reason so the settings row can always
// render and say WHY it cannot be switched on.
export type BiometryStatus = { native: boolean; available: boolean; reason: string };

export async function biometryStatus(): Promise<BiometryStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, available: false, reason: "Face ID needs the Boreal app on your phone or tablet." };
  }
  try {
    const info: any = await BiometricAuth.checkBiometry();
    if (info?.isAvailable) return { native: true, available: true, reason: "" };
    return {
      native: true,
      available: false,
      reason: String(info?.reason || "Face ID is not set up on this device. Turn it on in Settings, then come back."),
    };
  } catch (error: any) {
    return { native: true, available: false, reason: String(error?.message || "Face ID is not available on this device.") };
  }
}

// BF_CLIENT_FACE_ID_SETTING_v325 - set for this session only when the client has
// just signed in with a text code and could be using Face ID instead. The
// settings row reads it to explain itself once; it expires with the session, so
// it can never permanently silence anything the way PROMPTED_KEY did.
export const HINT_KEY = "bf_face_id_hint";

export async function isEnrolled(): Promise<boolean> {
  return !!parseStored(await namedCredentialStore.get(DEVICE_KEY));
}

// BF_CLIENT_ENROLL_REASON_v335
// Enrollment failures retain their stage and a useful, user-facing explanation
// instead of being collapsed into a bare false.
export type EnrollResult =
  | { ok: true }
  | { ok: false; stage: "biometry" | "session" | "cancelled" | "server"; message: string };

export async function enrollDeviceWithReason(): Promise<EnrollResult> {
  const status = await biometryStatus();
  if (!status.available) return { ok: false, stage: "biometry", message: status.reason };
  if (!getToken()) {
    return { ok: false, stage: "session", message: "Sign in with a text code first, then turn Face ID on." };
  }
  try {
    await BiometricAuth.authenticate({ reason: "Turn on Face ID sign-in", cancelTitle: "Not now", allowDeviceCredential: false });
  } catch (error: any) {
    // Tapping "Not now" is a choice, not a failure - no error belongs on screen.
    console.warn("face_id_enroll_prompt_dismissed", { message: String(error?.message ?? error) });
    return { ok: false, stage: "cancelled", message: "" };
  }
  try {
    const r = await apiRequest<Stored>("/api/client/device-sign-in/enroll", { method: "POST", body: { deviceLabel: Capacitor.getPlatform() } });
    if (!r?.credentialId || !r?.secret) {
      console.error("face_id_enroll_bad_response", { got: r ? Object.keys(r) : null });
      return { ok: false, stage: "server", message: "Boreal did not return a Face ID credential. Try again." };
    }
    await namedCredentialStore.set(DEVICE_KEY, JSON.stringify({ credentialId: r.credentialId, secret: r.secret }));
    return { ok: true };
  } catch (error: any) {
    const raw = String(error?.message ?? error);
    console.error("face_id_enroll_failed", { message: raw });
    if (raw.includes("client_session_required") || raw.includes("401")) {
      // BF_CLIENT_ACCOUNT_BAR_v341 - name the role, so this stops being a guess.
      const role = roleFromToken(getToken());
      const detail = role ? ` This sign-in is a "${role}" session, not a client one.` : "";
      return { ok: false, stage: "server", message: `Face ID could not be turned on.${detail} Sign out, then sign in again with a text code.` };
    }
    return { ok: false, stage: "server", message: `Boreal could not turn Face ID on: ${raw}` };
  }
}

export async function enrollThisDevice(): Promise<boolean> {
  return (await enrollDeviceWithReason()).ok;
}

export async function signInWithFaceId(): Promise<DeviceSignInData> {
  await BiometricAuth.authenticate({ reason: "Sign in to Boreal Financial", cancelTitle: "Use a text code", allowDeviceCredential: false });
  const stored = parseStored(await namedCredentialStore.get(DEVICE_KEY));
  if (!stored) throw Object.assign(new Error("Face ID sign-in is not set up on this phone."), { code: "not_enrolled" });
  try {
    const data = await apiRequest<DeviceSignInData>("/api/client/device-sign-in", { method: "POST", body: stored });
    if (!data?.token || !data?.secret) throw new Error("Face ID sign-in failed.");
    await namedCredentialStore.set(DEVICE_KEY, JSON.stringify({ credentialId: stored.credentialId, secret: data.secret }));
    setToken(data.token);
    return data;
  } catch (error: any) {
    if (error?.status === 401) {
      await namedCredentialStore.clear(DEVICE_KEY);
      throw Object.assign(new Error("Face ID sign-in has expired. Sign in with a text code to turn it back on."), { code: "expired" });
    }
    throw error;
  }
}

/** On sign-out: turn Face ID sign-in off on the server and forget it on this phone. */
export async function disableDeviceSignIn(): Promise<void> {
  const stored = parseStored(await namedCredentialStore.get(DEVICE_KEY));
  if (stored && getToken()) {
    await apiRequest("/api/client/device-sign-in/revoke", { method: "POST", body: { credentialId: stored.credentialId } }).catch((): undefined => undefined);
  }
  await namedCredentialStore.clear(DEVICE_KEY);
}

// BF_CLIENT_ACCOUNT_BAR_v341
// A 401 from the enroll route means the token's role is not "client". Which role
// it IS decides where the fault lies: "Admin" means the server minted a staff
// token despite userType:"client" (BF-Server v334 not running), anything else
// means the app is holding a token from before that sign-in. Reading it from the
// JWT turns a guess into a fact - the claim is already in the token the app is
// sending, and no request is needed to see it.
export function roleFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function phoneFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.phone === "string" ? payload.phone : null;
  } catch {
    return null;
  }
}

// BF_CLIENT_LOCK_SESSION_CHECK_v322
// Renew the session from the Face ID sign-in credential without a second Face ID
// prompt - used right after the lock screen's own Face ID succeeded. Plain fetch,
// so a refused credential never signs the client out on its own.
export async function renewSessionSilently(apiBase: string): Promise<boolean> {
  const stored = parseStored(await namedCredentialStore.get(DEVICE_KEY));
  if (!stored) return false;
  try {
    const res = await fetch(`${apiBase}/api/client/device-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stored),
    });
    if (res.status === 401) { await namedCredentialStore.clear(DEVICE_KEY); return false; }
    if (!res.ok) return false;
    const body = (await res.json()) as { token?: string; secret?: string; data?: { token?: string; secret?: string } };
    const data = body?.data ?? body;
    if (!data?.token || !data?.secret) return false;
    await namedCredentialStore.set(DEVICE_KEY, JSON.stringify({ credentialId: stored.credentialId, secret: data.secret }));
    setToken(data.token);
    return true;
  } catch {
    return false;
  }
}
