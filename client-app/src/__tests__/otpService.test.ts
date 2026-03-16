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

  it("keeps startOtp compatibility", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true }) })
    );

    await expect(startOtp("+15551112222")).resolves.toMatchObject({ ok: true });
  });

  it("calls verify OTP endpoint with E.164 phone and otpSessionId", async () => {
    const apiSpy = vi.spyOn(clientApi, "apiRequest").mockResolvedValue({ success: true, token: "abc" });

    await expect(verifyOtp("(555) 111-2222", "123456", "otp-session-1")).resolves.toMatchObject({ ok: true, sessionToken: "abc" });

    expect(apiSpy).toHaveBeenCalledWith(
      API_ENDPOINTS.OTP_VERIFY,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+15551112222", code: "123456", otpSessionId: "otp-session-1" }),
      })
    );
  });
});
