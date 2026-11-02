// BF_CLIENT_v789_ANALYTICS_GATES
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ value: false }));
vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => native.value } };
});

import { initClarity } from "@/lib/clarity";
import { loadGoogleTags } from "@/lib/thirdPartyTags";
import { CONSENT_KEY } from "@/utils/analytics";

type TagWindow = Window & { clarity?: unknown; gtag?: unknown; dataLayer?: unknown[] };

function scriptSrcs(): string[] {
  return Array.from(document.querySelectorAll("script")).map((s) => s.getAttribute("src") || "");
}

beforeEach(() => {
  native.value = false;
  localStorage.clear();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  const w = window as TagWindow;
  delete w.clarity;
  delete w.gtag;
  delete w.dataLayer;
});

afterEach(() => {
  localStorage.clear();
});

describe("Clarity loads only after analytics are accepted", () => {
  it("does not load before the visitor has answered the banner", () => {
    initClarity();
    expect(scriptSrcs().some((s) => s.includes("clarity.ms"))).toBe(false);
    expect((window as TagWindow).clarity).toBeUndefined();
  });

  it("does not load after Decline", () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    initClarity();
    expect(scriptSrcs().some((s) => s.includes("clarity.ms"))).toBe(false);
  });

  it("loads once after Accept", () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    initClarity();
    initClarity();
    expect(scriptSrcs().filter((s) => s.includes("clarity.ms/tag/"))).toHaveLength(1);
  });

  it("never loads in the native apps, even with consent", () => {
    native.value = true;
    localStorage.setItem(CONSENT_KEY, "granted");
    initClarity();
    expect(scriptSrcs().some((s) => s.includes("clarity.ms"))).toBe(false);
  });
});

describe("Google Tag Manager and Google Ads", () => {
  it("load on the web", () => {
    loadGoogleTags("other");
    const srcs = scriptSrcs();
    expect(srcs.some((s) => s.includes("googletagmanager.com/gtm.js?id=GTM-"))).toBe(true);
    expect(srcs.some((s) => s.includes("googletagmanager.com/gtag/js?id=AW-"))).toBe(true);
    expect(typeof (window as TagWindow).gtag).toBe("function");
  });

  it("never load in the native apps", () => {
    native.value = true;
    loadGoogleTags("other");
    expect(scriptSrcs().some((s) => s.includes("googletagmanager.com"))).toBe(false);
    expect((window as TagWindow).gtag).toBeUndefined();
  });
});
