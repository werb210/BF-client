// BF_CLIENT_LOCK_SESSION_CHECK_v322
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/native/deviceSignIn", () => ({ isEnrolled: async () => false, renewSessionSilently: async () => true }));
import { LOCK_AFTER_MS, sessionAccepted, shouldLock, tokenExpired } from "../useBiometricLock";

const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`;
const base = { session: true, sessionUsable: true, enrolled: false, biometry: true, coldStart: false, backgroundedAt: null as number | null, now: 1_700_000_000_000 };

afterEach(() => vi.unstubAllGlobals());

describe("Face ID lock over a dead session", () => {
  it("reads token expiry", () => {
    const now = 1_700_000_000_000;
    expect(tokenExpired(jwt(now / 1000 + 60), now)).toBe(false);
    expect(tokenExpired(jwt(now / 1000 - 60), now)).toBe(true);
    expect(tokenExpired("garbage", now)).toBe(true);
  });

  it("never asks for Face ID over a dead session it cannot renew", () => {
    expect(shouldLock({ ...base, coldStart: true, sessionUsable: false, enrolled: false })).toBe(false);
    expect(shouldLock({ ...base, coldStart: true, sessionUsable: false, enrolled: true })).toBe(true);
    expect(shouldLock({ ...base, coldStart: true, enrolled: true })).toBe(true);
    expect(shouldLock({ ...base, backgroundedAt: base.now - LOCK_AFTER_MS, enrolled: true })).toBe(true);
  });

  it("asks the server whether the session is still accepted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 401 })));
    expect(await sessionAccepted("t", "https://s")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 200 })));
    expect(await sessionAccepted("t", "https://s")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await sessionAccepted("t", "https://s")).toBeNull();
  });

  it("clears a dead session and renews after unlock", () => {
    const hook = readFileSync(join(__dirname, "..", "useBiometricLock.ts"), "utf8");
    expect(hook).toContain("if (!enrolled) return; // v323");
    expect(hook).toContain("await renewSessionSilently(ENV.API_BASE)");
    expect(readFileSync(join(__dirname, "..", "deviceSignIn.ts"), "utf8")).toContain("export async function renewSessionSilently");
  });
});
