// BF_CLIENT_v811_APP_USAGE - anonymous usage counts for the staff Marketing > Mobile apps report.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceFor, installId, sendUsage, trackOpen, OPEN_GAP_MS, usageUrl } from "../appUsage";

const fetchMock = vi.fn(async () => new Response("{}", { status: 202 }));
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe("v811 app usage", () => {
  it("tells phones from tablets", () => {
    expect(deviceFor("ios", "Mozilla/5.0 (iPhone)", 393)).toBe("iphone");
    expect(deviceFor("ios", "Mozilla/5.0 (Macintosh)", 820)).toBe("ipad");
    expect(deviceFor("ios", "Mozilla/5.0 (iPad)", 600)).toBe("ipad");
    expect(deviceFor("android", "", 412)).toBe("android");
    expect(deviceFor("android", "", 800)).toBe("android_tablet");
    expect(deviceFor("web", "", 1200)).toBe("web");
  });

  it("keeps one random install id per device", () => {
    const a = installId();
    expect(a).toMatch(/^[\w-]{10,}$/);
    expect(installId()).toBe(a);
  });

  it("sends only the event, platform, device, version and install id to Boreal's own server", async () => {
    await sendUsage("sign_in", { method: "code" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(usageUrl());
    expect(url.endsWith("/api/analytics")).toBe(true);
    const body = JSON.parse(String(init.body));
    expect(body.event).toBe("app_sign_in");
    expect(Object.keys(body.properties).sort()).toEqual(["device", "install_id", "method", "platform", "version"]);
    expect(body.properties.platform).toBe("web");
  });

  it("never throws when the network is down", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sendUsage("open")).resolves.toBeUndefined();
  });

  it("counts an open at most once per 30 minutes", async () => {
    expect(trackOpen(10_000_000)).toBe(true);
    expect(trackOpen(10_000_000 + 60_000)).toBe(false);
    expect(trackOpen(10_000_000 + OPEN_GAP_MS + 1)).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const events = fetchMock.mock.calls.map((c: any[]) => JSON.parse(String(c[1].body)).event);
    expect(events).toEqual(["app_open", "app_open"]);
  });
});
