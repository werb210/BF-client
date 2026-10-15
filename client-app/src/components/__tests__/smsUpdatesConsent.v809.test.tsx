// BF_CLIENT_v809_SMS_UPDATES_CONSENT
// Carriers (Twilio RCS / A2P review) require the client to choose texts with an unticked box next to its
// disclosure. The sign-in code is always sent; the "Text me updates" choice travels with the code check and
// can be changed later in the client portal's Settings.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../QuickSignIn", () => ({ default: (): null => null }));
vi.mock("@/lib/attribution", () => ({ getAttribution: () => ({}) }));
vi.mock("@/client/autosave", () => ({ adoptAnonDrafts: vi.fn(), currentDraftScope: vi.fn(), purgeLegacyDrafts: vi.fn() }));
vi.mock("../../state/useApplicationStore", () => ({ reconcileWithBootToken: vi.fn() }));
const api = vi.hoisted(() => ({ apiCall: vi.fn() }));
vi.mock("@/api/client", () => ({ apiCall: api.apiCall }));

import PhoneOTPInline from "../PhoneOTPInline";
import { SmsUpdatesToggle } from "../cmp/CmpSettings";
import { SMS_UPDATES_CONSENT_TEXT } from "@/lib/smsUpdatesConsent";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockReset().mockImplementation(async (url: string) => {
    if (url.endsWith("/api/auth/otp/start")) return json(200, { ok: true });
    if (url.endsWith("/api/auth/otp/verify")) return json(200, { token: "jwt-1" });
    if (url.endsWith("/api/client/applications/by-phone")) return json(200, { found: false });
    if (url.endsWith("/api/public/application/start")) return json(200, { applicationId: "app-new" });
    return json(404, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  api.apiCall.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const signIn = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes><Route path="/" element={<PhoneOTPInline />} /><Route path="*" element={<div data-testid="next" />} /></Routes>
    </MemoryRouter>,
  );
const verifyBody = () => {
  const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/auth/otp/verify"));
  return JSON.parse(String(call![1].body));
};

describe("v809 sign-in screen", () => {
  it("shows the optional box unticked, with the wording carriers asked for", () => {
    signIn();
    const box = screen.getByTestId("sms-updates-consent-checkbox") as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.getByTestId("sms-updates-consent").textContent).toBe(SMS_UPDATES_CONSENT_TEXT);
    expect(SMS_UPDATES_CONSENT_TEXT).toContain("Message frequency varies.");
    expect(SMS_UPDATES_CONSENT_TEXT).not.toContain("Up to 10");
    expect(screen.getByTestId("sms-disclosure").textContent).toContain("We'll text a one-time sign-in code to this number.");
  });

  it("an unticked box signs in as usual and sends no consent", async () => {
    signIn();
    fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "403 555 0101" } });
    fireEvent.change(await screen.findByPlaceholderText("Enter code"), { target: { value: "123456" } });
    await screen.findByTestId("next");
    expect(verifyBody().sms_updates_consent).toBe(false);
  });

  it("the box can still be ticked after the code is sent, and the choice goes with the code check", async () => {
    signIn();
    fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "403 555 0101" } });
    const code = await screen.findByPlaceholderText("Enter code");
    fireEvent.click(screen.getByTestId("sms-updates-consent-checkbox"));
    fireEvent.change(code, { target: { value: "123456" } });
    await screen.findByTestId("next");
    expect(verifyBody()).toMatchObject({ phone: "+14035550101", userType: "client", sms_updates_consent: true });
  });
});

describe("v809 client portal Settings", () => {
  it("shows the saved choice and changes it", async () => {
    api.apiCall.mockImplementation(async (url: string, init?: { method?: string }) => (init?.method === "POST" ? { ok: true } : { smsUpdates: false }));
    render(<SmsUpdatesToggle />);
    const box = screen.getByTestId("cmp-sms-updates-checkbox") as HTMLInputElement;
    await waitFor(() => expect(box.disabled).toBe(false));
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    await waitFor(() => expect(box.checked).toBe(true));
    expect(api.apiCall).toHaveBeenCalledWith("/api/client/sms-updates", { method: "POST", body: { smsUpdates: true } });
  });

  it("a failed save leaves the box as it was and says so", async () => {
    api.apiCall.mockImplementation(async (_url: string, init?: { method?: string }) => {
      if (init?.method === "POST") throw new Error("offline");
      return { smsUpdates: true };
    });
    render(<SmsUpdatesToggle />);
    const box = screen.getByTestId("cmp-sms-updates-checkbox") as HTMLInputElement;
    await waitFor(() => expect(box.checked).toBe(true));
    fireEvent.click(box);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(box.checked).toBe(true);
  });
});
