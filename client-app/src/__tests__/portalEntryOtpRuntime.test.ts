import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalEntry } from "../pages/PortalEntry";
import { ClientProfileStore } from "../state/clientProfiles";

const { startOtpMock, verifyOtpMock } = vi.hoisted(() => ({
  startOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  normalizeOtpPhone: (value: string) => value,
  startOtp: startOtpMock,
  verifyOtp: verifyOtpMock,
}));

vi.mock("../components/OtpInput", () => ({
  OtpInput: ({ onComplete }: { onComplete: (code: string) => void }) => {
    useEffect(() => {
      onComplete("123456");
    }, [onComplete]);

    return createElement("input", { "data-testid": "otp-code" });
  },
}));

describe("PortalEntry OTP runtime", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    startOtpMock.mockReset();
    verifyOtpMock.mockReset();
    ClientProfileStore.setLastUsedPhone("(555) 111-2222");

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("keeps phone step and shows error when request-otp fails", async () => {
    startOtpMock.mockResolvedValue({ ok: false, status: 400, message: "Invalid phone payload" });

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    const form = container.querySelector("form") as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(startOtpMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Invalid phone payload");
    expect(container.textContent).not.toContain("Enter the 6-digit code sent to your phone.");

    const phoneField = container.querySelector("#portal-phone") as HTMLInputElement;
    expect(phoneField.value).toContain("555");
  });

  it("renders OTP entry inputs after request-otp succeeds", async () => {
    startOtpMock.mockResolvedValue({ ok: true, otpSessionId: "otp-session-1" });

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    const form = container.querySelector("form") as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(startOtpMock).toHaveBeenCalledTimes(1);

    const otpCodeInput = container.querySelector('[data-testid="otp-code"]');
    expect(otpCodeInput).toBeTruthy();
  });

  it("auto-submits verification when 6 digits are entered and otpSessionId exists", async () => {
    startOtpMock.mockResolvedValue({ ok: true, otpSessionId: "otp-session-1" });
    verifyOtpMock.mockResolvedValue({ ok: false });

    await act(async () => {
      root.render(createElement(PortalEntry));
    });

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(verifyOtpMock).toHaveBeenCalledWith("(555) 111-2222", "123456", "otp-session-1");
    expect(container.textContent).toContain("Invalid code. Please try again.");
  });
});
