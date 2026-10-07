// BF_CLIENT_OTP_START_MESSAGE_v740
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/PhoneOTPInline.tsx", "utf8");

describe("sign-in shows the server's reason a number can't get a code", () => {
  it("uses the message for landline and invalid numbers, generic text otherwise", () => {
    expect(src).toContain("parsed.error === 'landline_number' || parsed.error === 'invalid_number'");
    expect(src).toContain("throw new Error(serverMessage || 'Could not send code. Please double-check your number and try again.');");
  });
});
