// BF_CLIENT_LOCK_LOOP_FIX_v312
import { describe, expect, it } from "vitest";
import { LOCK_AFTER_MS, shouldLock } from "../useBiometricLock";

const base = { session: true, biometry: true, coldStart: false, backgroundedAt: null as number | null, now: 1_000_000 };

describe("Face ID lock", () => {
  it("locks on a cold start with a session", () => {
    expect(shouldLock({ ...base, coldStart: true })).toBe(true);
  });
  it("does not relock when the Face ID prompt itself briefly makes the app inactive", () => {
    expect(shouldLock({ ...base, backgroundedAt: base.now - 3_000 })).toBe(false);
    expect(shouldLock({ ...base, backgroundedAt: null })).toBe(false);
  });
  it("locks again after the app has been away for a minute", () => {
    expect(shouldLock({ ...base, backgroundedAt: base.now - LOCK_AFTER_MS })).toBe(true);
  });
  it("never locks without a session or Face ID", () => {
    expect(shouldLock({ ...base, coldStart: true, session: false })).toBe(false);
    expect(shouldLock({ ...base, coldStart: true, biometry: false })).toBe(false);
  });
});
