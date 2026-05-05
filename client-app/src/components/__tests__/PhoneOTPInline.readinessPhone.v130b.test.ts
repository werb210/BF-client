// BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("PhoneOTPInline readiness_phone payload (v130b mirror)", () => {
  const src = readFileSync(
    join(__dirname, "..", "PhoneOTPInline.tsx"),
    "utf8"
  );

  it("sends readiness_phone in /application/start body", () => {
    expect(src).toContain("readiness_phone: phoneE164");
  });

  it("does not send a bare phone key in /application/start body", () => {
    const bodyLineIdx = src.indexOf("body: JSON.stringify({ source: 'client_direct'");
    expect(bodyLineIdx).toBeGreaterThan(-1);
    const bodyLine = src.slice(bodyLineIdx, src.indexOf("\n", bodyLineIdx));
    expect(bodyLine).not.toMatch(/\bphone:\s/);
  });
});
