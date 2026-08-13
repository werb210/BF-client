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
    // BF_CLIENT_OTP_ATTRIBUTION_v1 - the body is no longer one line, so anchor
    // on the mint fetch and read to the end of the request object.
    const mintIdx = src.indexOf("API_BASE + '/api/public/application/start'");
    expect(mintIdx).toBeGreaterThan(-1);
    const bodyIdx = src.indexOf("body: JSON.stringify({", mintIdx);
    const body = src.slice(bodyIdx, src.indexOf("15000,", bodyIdx));
    expect(body).not.toMatch(/\bphone:\s/);
    expect(body).toContain("readiness_phone: phoneE164");
  });
});
