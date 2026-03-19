import { describe, expect, it, vi } from "vitest";
import { clearSession } from "@/auth/session";

vi.mock("@/auth/session", () => ({
  clearSession: vi.fn(),
}));

describe("401 session expiry handling", () => {
  it("clears session and redirects to login when outside login page", async () => {
    window.history.replaceState({}, "", "/dashboard");

    const hrefSetter = vi.fn();
    const locationLike = {
      pathname: "/dashboard",
    } as Location;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        get pathname() {
          return locationLike.pathname;
        },
        set href(value: string) {
          hrefSetter(value);
        },
      },
    });

    await import("@/api/interceptors");
    const { apiClient } = await import("@/api/client");

    const rejection = {
      response: {
        status: 401,
      },
    };

    const onRejected = apiClient.interceptors.response.handlers.at(-1)?.rejected;
    await expect(onRejected?.(rejection)).rejects.toEqual(rejection);

    expect(clearSession).toHaveBeenCalledOnce();
    expect(hrefSetter).toHaveBeenCalledWith("/login");
  });
});
