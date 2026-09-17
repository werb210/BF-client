// BF_CLIENT_LOCK_ONLY_ENROLLED_v323
import { describe, expect, it, vi } from "vitest";
vi.mock("@/native/deviceSignIn", () => ({ isEnrolled: async () => false, renewSessionSilently: async () => false }));
import { shouldLock } from "../useBiometricLock";

const base = { session: true, sessionUsable: true, biometry: true, coldStart: true, backgroundedAt: null as number | null, now: 1 };

describe("Face ID lock follows the client's Face ID sign-in choice", () => {
  it("never prompts at launch when Face ID sign-in is off, even with a stored session", () => {
    expect(shouldLock({ ...base, enrolled: false })).toBe(false);
    expect(shouldLock({ ...base, enrolled: false, sessionUsable: false })).toBe(false);
  });
  it("prompts once when Face ID sign-in is on", () => {
    expect(shouldLock({ ...base, enrolled: true })).toBe(true);
    expect(shouldLock({ ...base, enrolled: true, sessionUsable: false })).toBe(true);
  });
});
