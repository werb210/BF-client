import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), "src", ...parts), "utf-8");
const step3 = read("wizard", "Step3_Business.tsx");
const otpPage = read("pages", "OtpPage.tsx");
const inline = read("components", "PhoneOTPInline.tsx");

describe("BF_CLIENT_AUTOFILL_STEP3_OTP_v1", () => {
  it("tags the business address so iOS can fill it", () => {
    expect(step3).toContain('autoComplete="address-level2"');
    expect(step3).toContain('autoComplete="postal-code"');
    expect(step3).toContain('autoComplete="url"');
    expect(step3).toContain('autoComplete="organization"');
  });

  it("gives the sign-in number field everything WebKit looks for", () => {
    expect(otpPage).toContain('name="tel"');
    expect(otpPage).toContain('autoComplete="tel"');
    expect(otpPage).toContain('inputMode="tel"');
  });

  it("names the inline phone field too", () => {
    expect(inline).toContain('name="tel"');
    expect(inline).toContain('autoComplete="tel"');
  });

  it("keeps the one-time-code field untouched", () => {
    expect(otpPage).toContain('autoComplete="one-time-code"');
    expect(inline).toContain('autoComplete="one-time-code"');
  });
});
