// BF_CLIENT_v819_BIOMETRIC_WORDING
import { describe, expect, it } from "vitest";
import { biometricUnavailableText } from "../FaceIdSignInToggle";

describe("v819 biometric unavailable wording", () => {
  it("tells the client what to do, in plain words", () => {
    expect(biometricUnavailableText(true)).toBe("Set up a fingerprint or face unlock in your phone's settings to use this.");
    expect(biometricUnavailableText(false)).toBe("Set up Face ID in your iPhone's settings to use this.");
  });
  it("never shows developer text", () => {
    for (const a of [true, false]) expect(biometricUnavailableText(a)).not.toMatch(/biometrics enrolled|Not available/i);
  });
});
