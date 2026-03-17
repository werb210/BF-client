import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeOtpPhone, requestOtp, startOtp, verifyOtp } from "../services/auth";
import * as clientApi from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";
import * as tokenStorage from "@/auth/tokenStorage";

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

  it("calls request OTP endpoint with phone payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, sessionToken: "session-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestOtp("(555) 111-2222")).resolves.toMatchObject({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      clientApi.buildApiUrl(API_ENDPOINTS.OTP_START),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+15551112222" }),
      })
    );
  });

  it('startOtp("5878881837") sends normalized E.164 payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, normalizedPhone: "+15878881837" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(startOtp("5878881837")).resolves.toMatchObject({ ok: true, normalizedPhone: "+15878881837" });

    expect(fetchMock).toHaveBeenCalledWith(
      clientApi.buildApiUrl(API_ENDPOINTS.OTP_START),
      expect.objectContaining({
        body: JSON.stringify({ phone: "+15878881837" }),
      })
    );
  });

  it("normalizes 10-digit NANP numbers to E.164", () => {
    expect(normalizeOtpPhone("5878881837")).toBe("+15878881837");
    expect(normalizeOtpPhone("+1 (587) 888-1837")).toBe("+15878881837");
  });

  it('verifyOtp("5878881837", "123456") uses apiClient, stores session token, and redirects to nextPath', async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: {
        ok: true,
        data: { sessionToken: "abc", nextPath: "/application/start" },
      },
    });
    const setTokenSpy = vi.spyOn(tokenStorage, "setToken").mockImplementation(() => undefined);

    await expect(verifyOtp("5878881837", "123456")).resolves.toMatchObject({
      ok: true,
      data: { sessionToken: "abc", nextPath: "/application/start" },
    });

    expect(clientApi.apiClient.post).toHaveBeenCalledWith("/auth/otp/verify", {
      phone: "5878881837",
      code: "123456",
    });
    expect(setTokenSpy).toHaveBeenCalledWith("abc");
    expect(window.location.href).toBe("/application/start");
  });

  it("throws when verify OTP request is not ok", async () => {
    vi.spyOn(clientApi.apiClient, "post").mockResolvedValue({
      data: { ok: false, error: { message: "Invalid code" } },
    });

    await expect(verifyOtp("(555) 111-2222", "123456")).rejects.toThrow("Invalid code");
  });
});
