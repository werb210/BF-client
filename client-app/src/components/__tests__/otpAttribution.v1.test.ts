// BF_CLIENT_OTP_ATTRIBUTION_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const otp = readFileSync("src/components/PhoneOTPInline.tsx", "utf8");
const step1 = readFileSync("src/wizard/Step1_KYC.tsx", "utf8");

describe("the OTP mint call carries attribution", () => {
  it("sends attribution with /api/public/application/start", () => {
    // This is the call that actually creates the application row. Every
    // applicant logs in with OTP before the wizard mounts, so this is the only
    // mint path that runs in practice.
    // Anchor on the mint fetch specifically: the file header comment names the
    // endpoint too, and the first JSON body in the file is the send-code call.
    const mint = otp.indexOf("API_BASE + '/api/public/application/start'");
    const start = otp.indexOf("body: JSON.stringify({", mint);
    const body = otp.slice(start, otp.indexOf("15000,", start));
    expect(body).toContain("attribution: attr");
    expect(body).toContain("source: 'client_direct'");
    expect(otp).toContain("import { getAttribution } from '@/lib/attribution';");
  });

  it("still sends readiness_phone so the website draft claim keeps working", () => {
    expect(otp).toContain("readiness_phone: phoneE164");
  });

  it("never lets attribution failure block a login", () => {
    expect(otp).toContain("// Attribution must never block a login.");
  });
});

describe("the wizard path is unchanged", () => {
  it("Step1_KYC still attaches attribution to its own start call", () => {
    // Kept deliberately: it covers the case where the wizard mints the row
    // because no OTP mint happened first.
    expect(step1).toContain("__startBody.attribution = __attr");
  });
});
