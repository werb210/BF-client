import { describe, expect, it, vi, beforeEach } from "vitest";
import { refreshSessionOnce, resetRefreshFailure } from "../sessionRefresh";
import { clearServiceWorkerCaches } from "../../pwa/serviceWorker";
import { ClientProfileStore } from "../../state/clientProfiles";
import { apiRequest } from "../../api/client";
import { setToken } from "../../lib/api";

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
    setToken("session-token");
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => key === "bf_token" ? "session-token" : null);
    localStorage.setItem("bf_token", "session-token");
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { assign: vi.fn() },
      },
      configurable: true,
    });
  });

  it("marks refresh failed and clears session state when refresh fails", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("refresh failed"));

    const result = await refreshSessionOnce();

    expect(result).toBe(false);
    expect(ClientProfileStore.clearPortalSessions).toHaveBeenCalled();
    expect(clearServiceWorkerCaches).toHaveBeenCalledWith("otp");
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
