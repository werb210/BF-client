/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import OtpPage from "../OtpPage";
import { startOtp } from "@/api/auth";

vi.mock("@/api/auth", () => ({
  startOtp: vi.fn().mockResolvedValue(undefined),
  verifyOtp: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));

describe("OtpPage", () => {
  it("renders OTP input with one-time-code autocomplete and numeric input mode", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(<OtpPage />);
    });

    const phoneInput = container.querySelector('input[type="tel"]');
    expect(phoneInput).toBeTruthy();
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    expect(valueSetter).toBeTruthy();
    act(() => {
      if (!phoneInput || !valueSetter) return;
      valueSetter.call(phoneInput, "5550000000");
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const sendButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send Code")
    );
    expect(sendButton).toBeTruthy();
    await act(async () => {
      sendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(startOtp).toHaveBeenCalled();

    const otpInput = container.querySelector('input[autocomplete="one-time-code"]');
    expect(otpInput).toBeTruthy();
    expect(otpInput?.getAttribute("inputmode")).toBe("numeric");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
