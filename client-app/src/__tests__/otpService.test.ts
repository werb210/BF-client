import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeOtpPhone, requestOtp, startOtp, verifyOtp } from "../services/auth";
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
      sent: true,
      normalizedPhone: "+15878881837",
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

  it('verifyOtp("5878881837", "123456") posts to verify endpoint and returns nextPath payload', async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: {
        ok: true,
        data: { sessionToken: "abc", nextPath: "/application/start" },
      },
    } as any);

    await expect(verifyOtp("5878881837", "123456")).resolves.toMatchObject({
      ok: true,
      sessionToken: "abc",
      token: "abc",
      nextPath: "/application/start",
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

  it("returns failed result when verify OTP request is not ok", async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: { ok: false, error: { message: "Invalid code" } },
    } as any);

    await expect(verifyOtp("(555) 111-2222", "123456")).resolves.toMatchObject({
      ok: false,
      message: "Invalid code",
    });
  });
});
