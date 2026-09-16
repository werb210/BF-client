// BF_CLIENT_FACE_ID_SIGN_IN_v297
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const store = new Map<string, string>();
const apiRequest = vi.hoisted(() => vi.fn());
const authenticate = vi.hoisted(() => vi.fn(async () => undefined));
const setToken = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" }, registerPlugin: () => ({}) }));
vi.mock("@aparajita/capacitor-biometric-auth", () => ({ BiometricAuth: { authenticate, checkBiometry: async () => ({ isAvailable: true }) } }));
vi.mock("@/lib/api", () => ({ apiRequest }));
vi.mock("@/auth/token", () => ({ getToken: () => "session-token", setToken }));
vi.mock("@/auth/credentialStore", () => ({
  namedCredentialStore: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => { store.set(k, v); },
    clear: async (k: string) => { store.delete(k); },
  },
}));

import { DEVICE_KEY, disableDeviceSignIn, enrollThisDevice, isEnrolled, parseStored, phoneFromToken, signInWithFaceId } from "../deviceSignIn";

beforeEach(() => { store.clear(); apiRequest.mockReset(); authenticate.mockClear(); setToken.mockClear(); });

describe("Face ID sign-in on the phone", () => {
  it("enrolls after Face ID and keeps the credential in secure storage", async () => {
    apiRequest.mockResolvedValueOnce({ credentialId: "c-1", secret: "s-1" });
    expect(await enrollThisDevice()).toBe(true);
    expect(authenticate).toHaveBeenCalled();
    expect(parseStored(store.get(DEVICE_KEY) ?? null)).toEqual({ credentialId: "c-1", secret: "s-1" });
    expect(await isEnrolled()).toBe(true);
  });

  it("requires Face ID before signing in, saves the session and the rotated secret", async () => {
    store.set(DEVICE_KEY, JSON.stringify({ credentialId: "c-1", secret: "s-1" }));
    apiRequest.mockResolvedValueOnce({ token: "jwt-2", secret: "s-2", hasSubmittedApplication: true, submittedApplicationId: "app-9" });
    const data = await signInWithFaceId();
    expect(authenticate.mock.invocationCallOrder[0]).toBeLessThan(apiRequest.mock.invocationCallOrder[0]);
    expect(apiRequest).toHaveBeenCalledWith("/api/client/device-sign-in", { method: "POST", body: { credentialId: "c-1", secret: "s-1" } });
    expect(setToken).toHaveBeenCalledWith("jwt-2");
    expect(parseStored(store.get(DEVICE_KEY) ?? null)?.secret).toBe("s-2");
    expect(data.submittedApplicationId).toBe("app-9");
  });

  it("forgets an expired credential so the text code turns it back on", async () => {
    store.set(DEVICE_KEY, JSON.stringify({ credentialId: "c-1", secret: "s-1" }));
    apiRequest.mockRejectedValueOnce(Object.assign(new Error("401"), { status: 401 }));
    await expect(signInWithFaceId()).rejects.toMatchObject({ code: "expired" });
    expect(store.has(DEVICE_KEY)).toBe(false);
  });

  it("does not sign in if Face ID is cancelled", async () => {
    store.set(DEVICE_KEY, JSON.stringify({ credentialId: "c-1", secret: "s-1" }));
    authenticate.mockRejectedValueOnce(new Error("cancelled"));
    await expect(signInWithFaceId()).rejects.toThrow("cancelled");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("sign-out revokes on the server and clears the phone", async () => {
    store.set(DEVICE_KEY, JSON.stringify({ credentialId: "c-1", secret: "s-1" }));
    apiRequest.mockResolvedValueOnce({ revoked: 1 });
    await disableDeviceSignIn();
    expect(apiRequest).toHaveBeenCalledWith("/api/client/device-sign-in/revoke", { method: "POST", body: { credentialId: "c-1" } });
    expect(store.has(DEVICE_KEY)).toBe(false);
  });

  it("reads the phone from the session token", () => {
    const token = `x.${btoa(JSON.stringify({ phone: "+17805551212" }))}.y`;
    expect(phoneFromToken(token)).toBe("+17805551212");
  });
});

describe("wiring", () => {
  const src = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(src, p), "utf8");
  it("sign-in screen, sign-out, lock fix and native storage keys", () => {
    const otp = read("pages/OtpPage.tsx");
    expect(otp).toContain('data-testid="face-id-sign-in"');
    expect(otp).toContain("await offerFaceId();");
    expect(read("auth/logout.ts")).toContain("disableDeviceSignIn()");
    expect(read("native/useBiometricLock.ts")).toContain("if (getToken()) return true;");
    const ios = readFileSync(join(src, "..", "ios", "App", "App", "SecureCredentialsPlugin.swift"), "utf8");
    expect(ios).toContain('call.getString("key") ?? defaultAccount');
    const android = readFileSync(join(src, "..", "android", "app", "src", "main", "java", "com", "boreal", "client", "SecureCredentialsPlugin.java"), "utf8");
    expect(android.match(/call\.getString\("key", "token"\)/g)?.length).toBe(3);
  });
});
