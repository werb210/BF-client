/* @vitest-environment jsdom */
// BF_CLIENT_INSTALL_NOT_ON_SIGN_IN_v1 - never over the sign-in form; "Not now" is remembered.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useInstallPrompt", () => ({ useInstallPrompt: () => ({ canInstall: true, promptInstall: vi.fn() }) }));
import InstallPromptBanner, { isClientPortalPath, isSignInPath } from "../InstallPromptBanner";

describe("install banner and the sign-in screen", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const show = async (path: string) => { await act(async () => { root.render(<MemoryRouter initialEntries={[path]}><InstallPromptBanner /></MemoryRouter>); }); };

  it("treats the landing page and /otp as sign-in pages", () => {
    expect(isSignInPath("/")).toBe(true);
    expect(isSignInPath("/otp")).toBe(true);
    expect(isSignInPath("/portal")).toBe(false);
  });
  it("is hidden on the sign-in page", async () => {
    await show("/");
    expect(container.innerHTML).toBe("");
  });
  it("leaves the client portal to its own get-the-app card", async () => {
    expect(isClientPortalPath("/portal")).toBe(true);
    expect(isClientPortalPath("/application/abc")).toBe(true);
    await show("/portal");
    expect(container.innerHTML).toBe("");
  });
  it("shows after sign-in elsewhere and Not now keeps it away", async () => {
    await show("/apply");
    const notNow = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Not now")!;
    expect(notNow).toBeTruthy();
    await act(async () => { notNow.click(); });
    expect(container.innerHTML).toBe("");
    expect(Number(localStorage.getItem("install-banner-dismissed-until"))).toBeGreaterThan(Date.now());
  });
});
