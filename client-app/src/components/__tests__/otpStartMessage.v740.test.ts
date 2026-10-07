// BF_CLIENT_OTP_START_MESSAGE_v740
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/PhoneOTPInline.tsx", "utf8");

describe("sign-in shows the server's reason a number can't get a code", () => {
  it("uses the message for landline and invalid numbers, generic text otherwise", () => {
    expect(src).toContain("SERVER_MESSAGE_CODES.includes(String(parsed.error))");
    for (const code of ["landline_number", "invalid_number", "unsupported_country", "otp_phone_daily_limit", "otp_busy"]) expect(src).toContain("'" + code + "'"); // BF_CLIENT_OTP_GUARD_MESSAGES_v741
    expect(src).toContain("throw new Error(serverMessage || 'Could not send code. Please double-check your number and try again.');");
  });
});
