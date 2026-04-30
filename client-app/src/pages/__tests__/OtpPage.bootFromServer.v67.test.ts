// BF_CLIENT_v67_OTP_BOOT_FROM_SERVER
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BF_CLIENT_v67_OTP_BOOT_FROM_SERVER", () => {
  const src = readFileSync(
    join(__dirname, "..", "OtpPage.tsx"),
    "utf8"
  );

  it("anchor present", () => {
    expect(src).toContain("BF_CLIENT_v67_OTP_BOOT_FROM_SERVER");
  });

  it("imports ClientProfileStore", () => {
    expect(src).toMatch(/import\s*\{\s*ClientProfileStore\s*\}\s*from\s*"@\/state\/clientProfiles"/);
  });

  it("handleVerify reads hasSubmittedApplication and submittedApplicationId from the verify response", () => {
    expect(src).toContain("hasSubmittedApplication === true");
    expect(src).toContain("verifyData?.submittedApplicationId");
  });

  it("handleVerify calls ClientProfileStore.markSubmitted with the server-confirmed token", () => {
    expect(src).toMatch(/ClientProfileStore\.markSubmitted\(formatted,\s*verifyData\.submittedApplicationId\)/);
  });

  it("resolveOtpNextStep is called with the LOCAL profile (not the verify response object)", () => {
    expect(src).toMatch(/const localProfile = ClientProfileStore\.getProfile\(formatted\);/);
    expect(src).toMatch(/resolveOtpNextStep\(localProfile\)/);
    expect(src).not.toMatch(/resolveOtpNextStep\(\(profile as any\)\?\.profile/);
  });

  it("the markSubmitted call is gated on a strict boolean check (not coerced)", () => {
    expect(src).toContain("hasSubmittedApplication === true");
  });
});
