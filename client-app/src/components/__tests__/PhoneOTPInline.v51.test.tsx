import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("BF_CLIENT_BLOCK_v51_OTP_LONGER_TIMEOUT_v1", () => {
  it("sets OTP start timeout to 60000ms", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../PhoneOTPInline.tsx"),
      "utf8"
    );
    expect(source).toContain("const OTP_START_TIMEOUT_MS = 60000");
  });
});
