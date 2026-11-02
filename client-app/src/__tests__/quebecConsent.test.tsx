// BF_CLIENT_v868_QUEBEC_CONSENT - Quebec (Law 25): Google Analytics and Google Ads wait for the banner's Accept.
// Everywhere else Google defaults to granted and Decline revokes it (adsConsent.v1.test.ts keeps that case too).
// When the server cannot tell where the visitor is, the browser's time zone and language decide.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TagWindow = Window & { dataLayer?: unknown[]; gtag?: unknown };
type Tags = typeof import("@/lib/thirdPartyTags");

const KEYS = ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"] as const;

function calls(): unknown[][] {
  return ((window as TagWindow).dataLayer || []).map((e) => (e && typeof e === "object" && "length" in (e as object) ? Array.from(e as ArrayLike<unknown>) : [e]));
}
function consentCalls(kind: "default" | "update"): Array<Record<string, unknown>> {
  return calls().filter((a) => a[0] === "consent" && a[1] === kind).map((a) => a[2] as Record<string, unknown>);
}
const all = (v: string) => Object.fromEntries(KEYS.map((k) => [k, v]));

let tags: Tags;
let Banner: typeof import("@/components/ConsentBanner").default;
let host: HTMLDivElement;
let root: Root | null = null;

async function renderBanner() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(Banner)); });
}
async function click(label: string) {
  const b = Array.from(host.querySelectorAll("button")).find((x) => x.textContent === label);
  if (!b) throw new Error(`${label} button not rendered`);
  await act(async () => b.click());
}
function setBrowser(timeZone: string, languages: string[]) {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ timeZone } as Intl.ResolvedDateTimeFormatOptions);
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
  vi.spyOn(navigator, "language", "get").mockReturnValue(languages[0] ?? "");
}
function serverSays(region: string) {
  const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ region }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", f);
  return f;
}

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const w = window as TagWindow;
  delete w.gtag;
  delete w.dataLayer;
  document.head.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
  tags = await import("@/lib/thirdPartyTags");
  Banner = (await import("@/components/ConsentBanner")).default;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("a visitor in Quebec", () => {
  it("starts with Google denied and the banner says tracking is off until they accept", async () => {
    tags.loadGoogleTags("QC");
    expect(consentCalls("default")[0]).toMatchObject(all("denied"));
    await renderBanner();
    expect(host.querySelector('[data-testid="consent-banner"]')?.getAttribute("data-region")).toBe("QC");
    expect(host.textContent).toContain("These stay off until you accept.");
    expect(consentCalls("update")).toHaveLength(0); // nothing turns on by itself
  });

  it("grants Google on Accept", async () => {
    tags.loadGoogleTags("QC");
    await renderBanner();
    await click("Accept");
    expect(consentCalls("update")[0]).toMatchObject(all("granted"));
  });

  it("keeps Google denied on Decline", async () => {
    tags.loadGoogleTags("QC");
    await renderBanner();
    await click("Decline");
    expect(consentCalls("update")[0]).toMatchObject(all("denied"));
  });

  it("puts the denied default ahead of anything pushed before the region was known", async () => {
    localStorage.setItem("boreal_consent_v1", "granted"); // a returning visitor who accepted earlier
    serverSays("QC");
    await renderBanner(); // applies the saved choice before Google has loaded
    await tags.startGoogleTags();
    const ordered = calls().filter((a) => a[0] === "consent");
    expect(ordered[0]?.[1]).toBe("default");
    expect(ordered[0]?.[2]).toMatchObject(all("denied"));
    expect(ordered[1]?.[2]).toMatchObject(all("granted"));
  });
});

describe("a visitor outside Quebec", () => {
  it("starts with Google granted, says so, and Decline denies it", async () => {
    tags.loadGoogleTags("other");
    const [defaults] = consentCalls("default");
    expect(defaults).toMatchObject({ ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
    await renderBanner();
    expect(host.textContent).toContain("on unless you decline");
    expect(host.textContent).toContain("Session recordings start only if you accept.");
    await click("Decline");
    expect(consentCalls("update")[0]).toMatchObject(all("denied"));
  });

  it("asks the server and loads Google granted for the rest of Canada and the US", async () => {
    const f = serverSays("other");
    await tags.startGoogleTags();
    expect(String(f.mock.calls[0]?.[0])).toMatch(/\/api\/privacy\/region$/);
    expect(consentCalls("default")[0]).toMatchObject({ ad_storage: "granted", analytics_storage: "granted" });
  });
});

describe("when the server cannot tell", () => {
  it("treats Montreal or Toronto time with French (Canada) as Quebec", () => {
    expect(tags.fallbackRegion("America/Toronto", ["fr-CA"])).toBe("QC");
    expect(tags.fallbackRegion("America/Montreal", ["en-CA", "fr-CA"])).toBe("QC");
  });

  it("treats everything else as outside Quebec", () => {
    expect(tags.fallbackRegion("America/Toronto", ["en-CA"])).toBe("other");
    expect(tags.fallbackRegion("America/Edmonton", ["fr-CA"])).toBe("other");
    expect(tags.fallbackRegion("America/New_York", ["en-US"])).toBe("other");
    expect(tags.fallbackRegion(undefined, [])).toBe("other");
  });

  it("an unknown answer from the server falls back to the browser", async () => {
    setBrowser("America/Toronto", ["fr-CA", "en"]);
    serverSays("unknown");
    await tags.startGoogleTags();
    expect(consentCalls("default")[0]).toMatchObject(all("denied"));
    expect(sessionStorage.getItem("bf_privacy_region")).toBeNull(); // a guess is not kept
  });

  it("a failed or slow lookup falls back too, within 1.5 seconds", async () => {
    setBrowser("America/Vancouver", ["en-CA"]);
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_u: string, init?: { signal?: AbortSignal }) => new Promise((_res, rej) => {
      init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })));
    const region = tags.consentRegion();
    await vi.advanceTimersByTimeAsync(tags.REGION_TIMEOUT_MS);
    expect(await region).toBe("other");
  });

  it("keeps the server's answer for the browser session", async () => {
    const f = serverSays("QC");
    expect(await tags.consentRegion()).toBe("QC");
    expect(sessionStorage.getItem("bf_privacy_region")).toBe("QC");
    vi.resetModules();
    const fresh = await import("@/lib/thirdPartyTags");
    expect(await fresh.consentRegion()).toBe("QC");
    expect(f).toHaveBeenCalledTimes(1);
  });
});
