// BF_CLIENT_v789_ANALYTICS_ENDPOINT - first-party events go to the API origin.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsUrl, postAnalyticsEvent, trackEvent } from "../analytics";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("analytics endpoint", () => {
  it("is the absolute API base plus /api/analytics, with no /v1/", () => {
    expect(analyticsUrl()).toMatch(/^https?:\/\/[^/]+\/api\/analytics$/);
    expect(analyticsUrl()).not.toContain("/v1/");
  });

  it("trackEvent posts the event there", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    trackEvent("application_step_view", { step: 2 });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(analyticsUrl());
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.event_name).toBe("application_step_view");
    expect(body.payload.step).toBe(2);
  });

  it("swallows network failures and server errors", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(postAnalyticsEvent({ event_name: "x" })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(postAnalyticsEvent({ event_name: "x" })).resolves.toBeUndefined();
  });

  it("sends nothing after the visitor declined", async () => {
    localStorage.setItem("boreal_consent_v1", "denied");
    trackEvent("application_step_view", { step: 2 });
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
