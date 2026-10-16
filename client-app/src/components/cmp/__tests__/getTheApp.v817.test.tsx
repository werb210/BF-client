// BF_CLIENT_v817 - real app download links (install card + Settings), hidden inside the native app,
// and the Personal Net Worth description no longer claims a signature.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ on: false }));
vi.mock("@capacitor/core", async (orig) => {
  const real = await orig<typeof import("@capacitor/core")>();
  return { ...real, Capacitor: { ...real.Capacitor, isNativePlatform: () => native.on, getPlatform: () => (native.on ? "ios" : "web") } };
});

import InstallAppPrompt from "@/components/install/InstallAppPrompt";
import { GetTheAppGroup } from "@/components/cmp/CmpSettings";
import { FORM_INFO } from "@/components/cmp/CmpMore";
import { ANDROID_PLAY_STORE_URL, IOS_APP_STORE_FALLBACK_URL, iosAppStoreUrl } from "@/lib/appStoreLinks";

afterEach(() => { cleanup(); native.on = false; try { window.localStorage.clear(); } catch { /* ignore */ } });

describe("app store links", () => {
  it("uses the App Store id or URL from VITE_IOS_APP_STORE_URL, else the App Store search", () => {
    expect(iosAppStoreUrl({})).toBe(IOS_APP_STORE_FALLBACK_URL);
    expect(IOS_APP_STORE_FALLBACK_URL).toBe("https://apps.apple.com/ca/search?term=Boreal%20Financial");
    expect(iosAppStoreUrl({ VITE_IOS_APP_STORE_URL: "6745123456" })).toBe("https://apps.apple.com/app/id6745123456");
    expect(iosAppStoreUrl({ VITE_IOS_APP_STORE_URL: "https://apps.apple.com/ca/app/boreal/id6745123456" }))
      .toBe("https://apps.apple.com/ca/app/boreal/id6745123456");
    expect(iosAppStoreUrl({ VITE_IOS_APP_STORE_URL: "javascript:alert(1)" })).toBe(IOS_APP_STORE_FALLBACK_URL);
    expect(ANDROID_PLAY_STORE_URL).toBe("https://play.google.com/store/apps/details?id=com.boreal.client");
  });
});

describe("install card", () => {
  it("links to the stores instead of a Coming Soon note", () => {
    render(<InstallAppPrompt />);
    expect(screen.getByTestId("install-ios-link").getAttribute("href")).toBe(iosAppStoreUrl());
    expect(screen.getByTestId("install-android-link").getAttribute("href")).toBe(ANDROID_PLAY_STORE_URL);
    expect(screen.queryByText(/Coming Soon/i)).toBeNull();
  });

  it("is hidden inside the native app", () => {
    native.on = true;
    const { container } = render(<InstallAppPrompt />);
    expect(container.innerHTML).toBe("");
  });
});

describe("Settings: Get the app", () => {
  it("shows both store links in a browser", async () => {
    render(<GetTheAppGroup />);
    await waitFor(() => expect(screen.getByTestId("cmp-settings-get-app")).toBeTruthy());
    expect(screen.getByTestId("cmp-get-app-ios")).toBeTruthy();
    expect(screen.getByTestId("cmp-get-app-android")).toBeTruthy();
  });

  it("is hidden inside the native app", async () => {
    native.on = true;
    render(<GetTheAppGroup />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("cmp-settings-get-app")).toBeNull();
  });
});

describe("More: Personal Net Worth description", () => {
  it("does not say the client signs it", () => {
    expect(FORM_INFO.networth.desc).toBe("Your personal assets and debts, completed by you.");
    expect(FORM_INFO.networth.desc).not.toMatch(/sign/i);
  });
});
