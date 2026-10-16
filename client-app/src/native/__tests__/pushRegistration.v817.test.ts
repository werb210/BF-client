// @vitest-environment jsdom
// BF_CLIENT_v817 - the device push token reaches BF-Server with the signed-in session, including when the
// token arrived before sign-in; client portal https links open the matching in-app screen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ token: null as string | null }));
vi.mock("@/auth/token", () => ({ getToken: () => session.token }));

import { __setLastDeviceToken, postDeviceToken, stopBorealRuntime, syncPushRegistration } from "../borealRuntime";
import { parseNativeUrl } from "../deepLinks";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  session.token = null;
  stopBorealRuntime();
  localStorage.clear();
  fetchMock = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("push token registration", () => {
  it("sends the Keychain session (not localStorage) as the bearer token", async () => {
    session.token = "client-session-jwt";
    await expect(postDeviceToken("apns-device-token")).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/push\/register-token$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer client-session-jwt");
    expect(JSON.parse(String(init.body))).toMatchObject({ token: "apns-device-token" });
  });

  it("holds a token that arrives before sign-in and sends it after sign-in", async () => {
    await expect(postDeviceToken("apns-device-token")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    session.token = "client-session-jwt";
    await expect(syncPushRegistration()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a refused registration as not done", async () => {
    session.token = "client-session-jwt";
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(postDeviceToken("apns-device-token")).resolves.toBe(false);
  });

  it("forgets the device token on sign-out", async () => {
    __setLastDeviceToken("apns-device-token");
    stopBorealRuntime();
    session.token = "next-person";
    await expect(syncPushRegistration()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("client portal app links", () => {
  it("opens the same screen in the app", () => {
    expect(parseNativeUrl("https://client.boreal.financial/application/0b6f4b1e-1111-4111-8111-111111111111"))
      .toBe("/application/0b6f4b1e-1111-4111-8111-111111111111");
    expect(parseNativeUrl("https://client.boreal.financial/portal?section=documents")).toBe("/portal?section=documents");
    expect(parseNativeUrl("https://client.boreal.financial/")).toBe("/portal");
    expect(parseNativeUrl("https://evil.example/application/1")).toBe("/portal");
    expect(parseNativeUrl("http://client.boreal.financial/application/1")).toBe("/portal");
  });
});
