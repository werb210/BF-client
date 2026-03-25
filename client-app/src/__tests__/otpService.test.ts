import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithOtp, normalizeOtpPhone, requestOtp, startOtp } from "../services/auth";
import * as api from "@/lib/api";


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
    const apiRequestSpy = vi.spyOn(api, "apiRequest").mockResolvedValue({ sent: true } as any);

    const res = await requestOtp("(555) 111-2222");
    expect(res).toBeDefined();

    expect(apiRequestSpy).toHaveBeenCalledWith("/auth/otp/start", {
      method: "POST",
      body: { phone: "(555) 111-2222" },
    });
  });

  it('startOtp("5878881837") returns ok when server says ok=true', async () => {
    const apiRequestSpy = vi.spyOn(api, "apiRequest").mockResolvedValue({ sent: true } as any);

    const res = await startOtp("5878881837");
    expect(res).toBeDefined();

    expect(apiRequestSpy).toHaveBeenCalledWith(
      "/auth/otp/start",
      {
        method: "POST",
        body: { phone: "5878881837" },
      }
    );
  });

  it("normalizes 10-digit NANP numbers to E.164", () => {
    expect(normalizeOtpPhone("5878881837")).toBe("+15878881837");
    expect(normalizeOtpPhone("+1 (587) 888-1837")).toBe("+15878881837");
  });

  it('loginWithOtp("5878881837", "123456") posts to verify endpoint and returns token/user payload', async () => {
    const apiRequestSpy = vi.spyOn(api, "apiRequest").mockResolvedValue({
      token: "abc",
      user: { id: "u-1" },
      nextPath: "/portal",
    } as any);

    await expect(loginWithOtp("5878881837", "123456")).resolves.toMatchObject({
      token: "abc",
      nextPath: "/portal",
      user: {
        id: "u-1",
      },
    });

    expect(apiRequestSpy).toHaveBeenCalledWith(
      "/auth/otp/verify",
      {
        method: "POST",
        body: { phone: "5878881837", code: "123456" },
      }
    );
  });

  it("throws when verify OTP request is not ok", async () => {
    vi.spyOn(api, "apiRequest").mockResolvedValue({} as any);

    await expect(loginWithOtp("(555) 111-2222", "123456")).rejects.toThrow();
  });
});
