import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOtp, startOtp, verifyOtp } from "../services/auth";
import * as clientApi from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

describe("auth OTP service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      text: async () => JSON.stringify({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(startOtp("5878881837")).resolves.toMatchObject({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      clientApi.buildApiUrl(API_ENDPOINTS.OTP_START),
      expect.objectContaining({
        body: JSON.stringify({ phone: "+15878881837" }),
      })
    );
  });

  it('verifyOtp("5878881837", "123456", "otp-session-1") sends normalized payload with session id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: "abc" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyOtp("5878881837", "123456", "otp-session-1")).resolves.toMatchObject({
      ok: true,
      sessionToken: "abc",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      clientApi.buildApiUrl(API_ENDPOINTS.OTP_VERIFY),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+15878881837", code: "123456", otpSessionId: "otp-session-1" }),
      })
    );
  });

  it("throws when verify OTP request is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(verifyOtp("(555) 111-2222", "123456", "otp-session-1")).rejects.toThrow(
      "OTP verification failed"
    );
  });
});
