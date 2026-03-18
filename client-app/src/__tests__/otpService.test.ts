import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithOtp, normalizeOtpPhone, requestOtp, startOtp } from "../services/auth";
import * as clientApi from "../api/client";


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
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      status: 200,
      data: { ok: true, data: { otpSessionId: "otp-session-1" } },
    } as any);

    await expect(requestOtp("(555) 111-2222")).resolves.toMatchObject({
      ok: true,
      otpSessionId: "otp-session-1",
      status: 200,
    });

    expect(clientApi.apiClient.post).toHaveBeenCalledWith("/auth/otp/start", {
      phone: "+15551112222",
    });
  });

  it('startOtp("5878881837") returns ok when server says data.sent=true', async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: {
        ok: true,
        data: { sent: true, normalizedPhone: "+15878881837" },
      },
    } as any);

    await expect(startOtp("5878881837")).resolves.toMatchObject({
      ok: true,
      data: {
        sent: true,
      },
    });

    expect(clientApi.apiClient.post).toHaveBeenCalledWith(
      "/auth/otp/start",
      {
        phone: "+15878881837",
      },
      undefined
    );
  });

  it("normalizes 10-digit NANP numbers to E.164", () => {
    expect(normalizeOtpPhone("5878881837")).toBe("+15878881837");
    expect(normalizeOtpPhone("+1 (587) 888-1837")).toBe("+15878881837");
  });

  it('loginWithOtp("5878881837", "123456") posts to verify endpoint and returns token/user payload', async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: {
        ok: true,
        data: {
          token: "abc",
          user: { id: "u-1" },
          nextPath: "/portal",
        },
      },
    } as any);

    await expect(loginWithOtp("5878881837", "123456")).resolves.toMatchObject({
      authToken: "abc",
      nextPath: "/portal",
      user: {
        id: "u-1",
      },
    });

    expect(clientApi.apiClient.post).toHaveBeenCalledWith(
      "/auth/otp/verify",
      {
        phone: "+15878881837",
        code: "123456",
      },
      undefined
    );
  });

  it("throws when verify OTP request is not ok", async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: { ok: false, error: { message: "Invalid code" } },
    } as any);

    await expect(loginWithOtp("(555) 111-2222", "123456")).rejects.toThrow("OTP failed");
  });
});
