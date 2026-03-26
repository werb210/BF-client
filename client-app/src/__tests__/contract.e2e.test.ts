import { describe, expect, it, vi } from "vitest";
import { loginWithOtp } from "@/services/auth";
import { getTelephonyToken } from "@/services/telephonyService";

vi.mock("@/services/auth", () => ({
  loginWithOtp: vi.fn(),
}));

vi.mock("@/services/telephonyService", () => ({
  getTelephonyToken: vi.fn(),
}));

describe("contract:e2e", () => {
  it("otp -> verify -> telephony", async () => {
    vi.mocked(loginWithOtp).mockResolvedValue({ token: "otp-token" });
    vi.mocked(getTelephonyToken).mockResolvedValue({ voiceToken: "voice-token" } as never);

    const token = await loginWithOtp("+61400000000", "000000");
    expect(token).toEqual({ token: "otp-token" });

    const tel = await getTelephonyToken();
    expect(tel).toBeTruthy();
  });
});
