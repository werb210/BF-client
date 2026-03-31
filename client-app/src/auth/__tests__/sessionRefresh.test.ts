import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshSession } from "../sessionRefresh";

describe("refreshSession", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns false and clears token when refresh response is not ok", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("", { status: 500 }));

    const ok = await refreshSession();

    expect(ok).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  it("stores refreshed token and returns true", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "new-token" }), { status: 200 }),
    );

    const ok = await refreshSession();

    expect(ok).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith("token", "new-token");
  });

  it("returns false if called while a refresh is in progress", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    vi.spyOn(window, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = refreshSession();
    const second = await refreshSession();

    expect(second).toBe(false);

    resolveFetch?.(new Response(JSON.stringify({ token: "new-token" }), { status: 200 }));
    await expect(first).resolves.toBe(true);
  });
});
