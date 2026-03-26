import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithOtp, normalizeOtpPhone, requestOtp, startOtp } from "../services/auth";
import * as api from "@/api/auth";

describe("auth OTP service", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("calls requestOtp endpoint with normalized phone payload", async () => {
    const sendOtpSpy = vi.spyOn(api, "sendOtp").mockResolvedValue({ sent: true } as any);

    const res = await requestOtp("(555) 111-2222");
    expect(res).toBeDefined();

    expect(sendOtpSpy).toHaveBeenCalledWith("(555) 111-2222");
  });

  it('startOtp("5878881837") forwards input to sendOtp', async () => {
    const sendOtpSpy = vi.spyOn(api, "sendOtp").mockResolvedValue({ sent: true } as any);

    const res = await startOtp("5878881837");
    expect(res).toBeDefined();

    expect(sendOtpSpy).toHaveBeenCalledWith("5878881837");
  });

  it("normalizes phones to digits only", () => {
    expect(normalizeOtpPhone("5878881837")).toBe("5878881837");
    expect(normalizeOtpPhone("+1 (587) 888-1837")).toBe("15878881837");
  });

  it('loginWithOtp("5878881837", "123456") posts to verify endpoint and returns token payload', async () => {
    const verifyOtpSpy = vi.spyOn(api, "verifyOtp").mockResolvedValue("abc");

    await expect(loginWithOtp("5878881837", "123456")).resolves.toMatchObject({
      token: "abc",
    });

    expect(verifyOtpSpy).toHaveBeenCalledWith("5878881837", "123456");
  });

  it("throws when verify OTP request fails", async () => {
    vi.spyOn(api, "verifyOtp").mockRejectedValue(new Error("Missing token"));

    await expect(loginWithOtp("(555) 111-2222", "123456")).rejects.toThrow("Missing token");
  });
});
