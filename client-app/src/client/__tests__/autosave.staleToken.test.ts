import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchApplication } from "../autosave";

describe("patchApplication stale token handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears local state and redirects when API returns application_token_stale", async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...originalLocation,
        assign: assignSpy,
      },
    });

    localStorage.setItem("bf.application.token", "stale-token");
    localStorage.setItem("bf.application.draft", JSON.stringify({ step: 2 }));
    sessionStorage.setItem("some-session", "value");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: "application_token_stale",
            message: "Application token expired",
          },
        }),
      })
    );

    await expect(
      patchApplication("application-id", { metadata: { draft: true } })
    ).rejects.toBeInstanceOf(Error);

    expect(localStorage.getItem("bf.application.token")).toBeNull();
    expect(localStorage.getItem("bf.application.draft")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(assignSpy).toHaveBeenCalledWith(
      "/apply/step-1?reason=session_expired"
    );

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });
});
