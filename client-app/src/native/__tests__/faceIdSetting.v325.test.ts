// BF_CLIENT_FACE_ID_SETTING_v325
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(src, p), "utf8");
const toggle = read("components/FaceIdSignInToggle.tsx");
const otp = read("pages/OtpPage.tsx");
const portal = read("pages/MiniPortalPage.tsx");
const device = read("native/deviceSignIn.ts");

describe("there is always a visible way to turn Face ID on", () => {
  it("the mini-portal renders the row", () => {
    expect(portal).toContain("<FaceIdSignInToggle />");
    expect(portal).toContain('import FaceIdSignInToggle from "@/components/FaceIdSignInToggle"');
  });

  it("the row survives an unavailable biometry check instead of disappearing", () => {
    // v324 rendered only when checkBiometry().isAvailable was true, so a plugin
    // that failed to register produced an empty panel and no explanation.
    expect(toggle).toContain('data-testid="face-id-unavailable"');
    expect(toggle).toContain("Not available — {status.reason}");
  });

  it("hides only in a browser tab, where the device has no Face ID to offer", () => {
    expect(toggle).toContain("if (phase === \"ready\" && status && !status.native) return null;");
  });

  it("offers both directions once biometry is usable", () => {
    expect(toggle).toContain("Turn on Face ID sign-in");
    expect(toggle).toContain("Turn off");
    expect(toggle).toContain("await enrollDeviceWithReason()");
    expect(toggle).toContain("await disableDeviceSignIn()");
  });

  it("says something when enrollment fails rather than silently doing nothing", () => {
    expect(toggle).toContain("if (result.ok === false && result.message) setError(result.message);");
  });
});

describe("the one-shot prompt can no longer lock a device out", () => {
  it("the OTP page no longer asks through window.confirm", () => {
    expect(otp).not.toContain("window.confirm(\"Use Face ID");
  });

  it("it clears the old flag, so a device already burned by v297 recovers", () => {
    expect(otp).toContain("localStorage.removeItem(PROMPTED_KEY);");
  });

  it("the replacement hint is session-scoped, so it can never be permanent", () => {
    expect(otp).toContain("sessionStorage.setItem(HINT_KEY, \"1\");");
    expect(device).toContain('export const HINT_KEY = "bf_face_id_hint";');
  });
});

describe("the reason is kept, not collapsed to false", () => {
  it("biometryStatus reports native, available and a reason", () => {
    expect(device).toContain("export type BiometryStatus = { native: boolean; available: boolean; reason: string };");
    expect(device).toContain("export async function biometryStatus()");
    expect(device).toContain("info?.reason");
  });
});
