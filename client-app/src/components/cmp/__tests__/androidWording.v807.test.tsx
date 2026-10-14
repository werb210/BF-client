// BF_CLIENT_v807_ANDROID - "Face ID" is Apple's name; the Settings row on Android says fingerprint or face unlock.
import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ platform: "android" }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => h.platform, isNativePlatform: () => true }, registerPlugin: () => ({}) }));
vi.mock("@/native/deviceSignIn", () => ({
  HINT_KEY: "hint",
  biometryStatus: async () => ({ native: true, available: true, reason: "" }),
  isEnrolled: async () => false,
  enrollDeviceWithReason: async () => ({ ok: true }),
  disableDeviceSignIn: async (): Promise<void> => undefined,
}));

import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await new Promise((r) => setTimeout(r, 0)); });

describe("v807 biometric sign-in wording", () => {
  it("Android: fingerprint or face unlock", async () => {
    h.platform = "android";
    render(<FaceIdSignInToggle variant="row" />);
    await flush();
    expect(screen.getByRole("switch", { name: "Fingerprint or face unlock" })).toBeTruthy();
    expect(screen.getByTestId("face-id-setting").textContent).toContain("your fingerprint or face");
  });
  it("iPhone and iPad: Face ID", async () => {
    h.platform = "ios";
    render(<FaceIdSignInToggle variant="row" />);
    await flush();
    expect(screen.getByRole("switch", { name: "Face ID sign-in" })).toBeTruthy();
  });
});
