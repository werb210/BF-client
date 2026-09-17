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

export async function isEnrolled(): Promise<boolean> {
  return !!parseStored(await namedCredentialStore.get(DEVICE_KEY));
}

export async function enrollThisDevice(): Promise<boolean> {
  if (!(await biometryAvailable()) || !getToken()) return false;
  try {
    await BiometricAuth.authenticate({ reason: "Turn on Face ID sign-in", cancelTitle: "Not now", allowDeviceCredential: false });
    const r = await apiRequest<Stored>("/api/client/device-sign-in/enroll", { method: "POST", body: { deviceLabel: Capacitor.getPlatform() } });
    if (!r?.credentialId || !r?.secret) return false;
    await namedCredentialStore.set(DEVICE_KEY, JSON.stringify({ credentialId: r.credentialId, secret: r.secret }));
    return true;
  } catch {
    return false;
  }
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
