// BF_CLIENT_v815_CONSENT_ABOVE_BUTTON - the optional "Text me updates" box sits between the phone number and the
// "Start Your Application" button, unticked, and still appears once on the code screen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/appUsage", () => ({ trackUsage: (): void => undefined, trackOpen: (): boolean => false }));
vi.mock("@/components/QuickSignIn", () => ({ default: (): null => null }));
import PhoneOTPInline from "@/components/PhoneOTPInline";

afterEach(() => vi.unstubAllGlobals());

describe("Text me updates box placement", () => {
  it("is under the phone number and above Start Your Application, unticked", () => {
    render(<MemoryRouter><PhoneOTPInline /></MemoryRouter>);
    const phone = screen.getByPlaceholderText("(555) 000-0000");
    const box = screen.getByTestId("sms-updates-consent");
    const button = screen.getByRole("button", { name: /Start Your Application/ });
    expect(phone.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(screen.getByTestId("sms-disclosure")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((screen.getByTestId("sms-updates-consent-checkbox") as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByTestId("sms-updates-consent")).toHaveLength(1);
  });

  it("still appears once, unticked, below Use a different number on the code screen", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    render(<MemoryRouter><PhoneOTPInline /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "403 555 0101" } });
    await screen.findByPlaceholderText("Enter code");
    const differentNumber = screen.getByRole("button", { name: /Use a different number/ });
    const box = screen.getByTestId("sms-updates-consent");
    expect(differentNumber.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((screen.getByTestId("sms-updates-consent-checkbox") as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByTestId("sms-updates-consent")).toHaveLength(1);
  });
});
