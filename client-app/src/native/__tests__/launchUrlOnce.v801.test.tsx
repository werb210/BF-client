// BF_CLIENT_v801_LAUNCH_URL_ONCE
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";

const h = vi.hoisted(() => ({ launchUrl: "borealclient://home" as string | null, getLaunchUrl: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } }));
vi.mock("@capacitor/app", () => ({
  App: {
    getLaunchUrl: (...a: unknown[]) => { h.getLaunchUrl(...a); return Promise.resolve(h.launchUrl ? { url: h.launchUrl } : undefined); },
    addListener: async (): Promise<{ remove: () => Promise<void> }> => ({ remove: async () => undefined }),
    exitApp: vi.fn(),
  },
}));
vi.mock("@capacitor/network", () => ({ Network: { addListener: async (): Promise<{ remove: () => Promise<void> }> => ({ remove: async () => undefined }) } }));
vi.mock("../sharedFiles", () => ({ collectAndroidShares: vi.fn(), isSharedFileUrl: () => false, receiveSharedUrl: vi.fn() }));

import { useNativeRuntime, __resetLaunchUrlForTests } from "../useNativeRuntime";

let nav: NavigateFunction | null = null;
let path = "";
function Probe(): null {
  useNativeRuntime();
  nav = useNavigate();
  path = useLocation().pathname;
  return null;
}
const flush = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });

beforeEach(() => { h.getLaunchUrl.mockClear(); h.launchUrl = "borealclient://home"; __resetLaunchUrlForTests(); });

describe("the URL that opened the app is followed once, not on every screen change", () => {
  it("New Application stays on Step 1 after the app was opened from a link", async () => {
    render(<MemoryRouter initialEntries={["/application/abc"]}><Probe /></MemoryRouter>);
    await flush();
    expect(path).toBe("/portal"); // the launch link is honoured at start-up
    await act(async () => { nav!("/apply/step-1"); });
    await flush();
    expect(path).toBe("/apply/step-1");
    expect(h.getLaunchUrl).toHaveBeenCalledTimes(1);
  });
});
