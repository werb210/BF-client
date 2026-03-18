import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalEntry } from "../pages/PortalEntry";
import { ClientProfileStore } from "../state/clientProfiles";

const {
  startOtpMock,
  loginWithOtpMock,
  setTokenMock,
  ensureClientSessionMock,
  setActiveClientSessionTokenMock,
} = vi.hoisted(() => ({
  startOtpMock: vi.fn(),
  loginWithOtpMock: vi.fn(),
  setTokenMock: vi.fn(),
  ensureClientSessionMock: vi.fn(),
  setActiveClientSessionTokenMock: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  startOtp: startOtpMock,
  loginWithOtp: loginWithOtpMock,
}));

vi.mock("@/lib/auth", () => ({
  setToken: setTokenMock,
}));

vi.mock("@/state/clientSession", () => ({
  ensureClientSession: ensureClientSessionMock,
  setActiveClientSessionToken: setActiveClientSessionTokenMock,
}));

vi.mock("../components/OtpInput", () => ({
  OtpInput: ({ onComplete }: { onComplete: (code: string) => void }) => {
    useEffect(() => {
      onComplete("123456");
      onComplete("123456");
    }, [onComplete]);

    return createElement("input", { "data-testid": "otp-code" });
  },
}));



async function submitWithPhone(container: HTMLDivElement, phone: string) {
  const input = container.querySelector('input[name="phone"]') as HTMLInputElement;
  input.value = phone;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const form = container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await Promise.resolve();
}

describe("PortalEntry OTP runtime", () => {
  let container: HTMLDivElement;
  let root: Root | null;
  const originalLocation = window.location;

  beforeEach(() => {
    startOtpMock.mockReset();
    loginWithOtpMock.mockReset();
    setTokenMock.mockReset();
    ensureClientSessionMock.mockReset();
    setActiveClientSessionTokenMock.mockReset();

    ClientProfileStore.setLastUsedPhone("(555) 111-2222");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
    vi.spyOn(ClientProfileStore, "upsertProfile").mockImplementation(() => null);
    vi.spyOn(ClientProfileStore, "markSubmitted").mockImplementation(() => null);
    vi.spyOn(ClientProfileStore, "markPortalVerified").mockImplementation(() => undefined);
    vi.spyOn(ClientProfileStore, "setLastUsedPhone").mockImplementation(() => undefined);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
  });

  it("keeps phone step and shows error when request-otp fails", async () => {
    startOtpMock.mockResolvedValue({ ok: false, status: 400, message: "Invalid phone payload" });

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    await act(async () => {
      await submitWithPhone(container, "(555) 111-2222");
    });

    expect(startOtpMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Failed to send verification code");
    expect(container.textContent).not.toContain("Enter the 6-digit code sent to your phone.");
  });

  it("entering 6 digits auto-submits verification exactly once", async () => {
    startOtpMock.mockResolvedValue({ ok: true });
    loginWithOtpMock.mockRejectedValue(new Error("Invalid code"));

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    await act(async () => {
      await submitWithPhone(container, "(555) 111-2222");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loginWithOtpMock).toHaveBeenCalledTimes(1);
    expect(loginWithOtpMock).toHaveBeenCalledWith("(555) 111-2222", "123456");
  });

  it("verify success redirects to /portal", async () => {
    startOtpMock.mockResolvedValue({ ok: true });
    loginWithOtpMock.mockResolvedValue({
      token: "session-abc",
      nextPath: "/portal",
      user: { id: "u-1" },
    });

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    await act(async () => {
      await submitWithPhone(container, "(555) 111-2222");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(setTokenMock).toHaveBeenCalledWith("session-abc");
    expect(setActiveClientSessionTokenMock).toHaveBeenCalledWith("session-abc");
    expect(ensureClientSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: "(555) 111-2222", accessToken: "session-abc" })
    );
    expect(window.location.href).toBe("/portal");
  });

  it("verify failure shows inline error and no duplicate verify spam", async () => {
    startOtpMock.mockResolvedValue({ ok: true });
    loginWithOtpMock.mockRejectedValue(new Error("Wrong code"));

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    await act(async () => {
      await submitWithPhone(container, "(555) 111-2222");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Wrong code");
    expect(loginWithOtpMock).toHaveBeenCalledTimes(1);
  });
});
