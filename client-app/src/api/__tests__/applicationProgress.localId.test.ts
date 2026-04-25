import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveApplicationStep } from "../applicationProgress";

describe("saveApplicationStep local ID guards", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not PATCH for local placeholder IDs", async () => {
    await saveApplicationStep({
      applicationId: "local-1768585153909",
      step: 2,
      data: {},
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not PATCH for non-UUID IDs", async () => {
    await saveApplicationStep({
      applicationId: "abc-not-a-uuid",
      step: 2,
      data: {},
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("PATCHes for real UUID IDs", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await saveApplicationStep({
      applicationId: "550e8400-e29b-41d4-a716-446655440000",
      step: 2,
      data: {},
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/client/applications/550e8400-e29b-41d4-a716-446655440000");
    expect(init?.method).toBe("PATCH");
  });

  it("clears stale token state when UUID PATCH returns 410 application_token_stale", async () => {
    localStorage.setItem("applicationToken", "stale-token");
    localStorage.setItem(
      "application_state",
      JSON.stringify({ applicationToken: "stale-token", applicationId: "app-123", foo: "bar" })
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: { code: "application_token_stale" } }), {
        status: 410,
        headers: { "Content-Type": "application/json" },
      })
    );

    await saveApplicationStep({
      applicationId: "550e8400-e29b-41d4-a716-446655440000",
      step: 2,
      data: {},
    });

    expect(localStorage.getItem("applicationToken")).toBeNull();
    expect(JSON.parse(localStorage.getItem("application_state") || "{}")).toMatchObject({
      applicationToken: null,
      applicationId: null,
      foo: "bar",
    });
  });
});
