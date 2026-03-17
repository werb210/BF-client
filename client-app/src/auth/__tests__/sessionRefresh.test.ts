import { describe, expect, it, vi, beforeEach } from "vitest";
import { refreshSessionOnce, resetRefreshFailure } from "../sessionRefresh";
import { clearServiceWorkerCaches } from "../../pwa/serviceWorker";
import { ClientProfileStore } from "../../state/clientProfiles";
import { apiRequest } from "../../api/client";

vi.mock("../../pwa/serviceWorker", () => ({
  clearServiceWorkerCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../state/clientProfiles", () => ({
  ClientProfileStore: {
    clearPortalSessions: vi.fn(),
  },
}));

vi.mock("../../api/client", () => ({
  apiRequest: vi.fn(),
}));

describe("refreshSessionOnce", () => {
  beforeEach(() => {
    resetRefreshFailure();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("auth_token", "session-token");
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { assign: vi.fn() },
      },
      configurable: true,
    });
  });

  it("redirects to OTP when refresh fails", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("refresh failed"));
    const assignSpy = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {});

    const result = await refreshSessionOnce();

    expect(result).toBe(false);
    expect(ClientProfileStore.clearPortalSessions).toHaveBeenCalled();
    expect(clearServiceWorkerCaches).toHaveBeenCalledWith("otp");
    expect(assignSpy).toHaveBeenCalledWith("/portal");

    assignSpy.mockRestore();
  });

  it("blocks repeated refresh attempts after a failure", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("refresh failed"));
    await refreshSessionOnce();

    vi.mocked(apiRequest).mockResolvedValue({ ok: true } as never);
    const result = await refreshSessionOnce();

    expect(result).toBe(false);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});
