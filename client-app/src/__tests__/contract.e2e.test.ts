import { describe, it, expect } from "vitest";
import { loginWithOtp } from "@/services/auth";
import { getTelephonyToken } from "@/services/telephony";

describe("contract:e2e", () => {
  it("otp -> verify -> telephony", async () => {
    const token = await loginWithOtp("+61400000000", "000000");
    expect(token).toBeTruthy();

    const tel = await getTelephonyToken(token);
    expect(tel).toBeTruthy();
  });
});
