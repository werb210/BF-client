// BF_CLIENT_v808_MARKETING_OPTIN + BF_CLIENT_v808_CONSENT_WORDING
// The "Text me offers" box on Step 6 is the only consent to marketing texts: separate, optional, unticked by
// default, never needed to submit, and the server receives true only when it was ticked. The required agreement
// says texts come only from Boreal and the mobile number is never shared for marketing.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";
import { buildSubmissionPayload } from "@/wizard/submission";

const h = vi.hoisted(() => ({
  app: null as unknown as ApplicationData,
  update: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, update: h.update }),
  clearStoredApplication: vi.fn(),
}));
vi.mock("@/api/client", () => ({ apiCall: vi.fn(async () => ({})) }));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: { status: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
}));

import { MARKETING_SMS_OPTIN_TEXT, Step6_Review } from "@/wizard/Step6_Review";

let host: HTMLDivElement;
let root: Root;

async function render(app: ApplicationData): Promise<void> {
  h.app = app;
  await act(async () => {
    root.render(createElement(Step6_Review));
  });
}
const offersBox = (): HTMLInputElement => {
  const box = host.querySelector('[data-testid="marketing-sms-consent"] input[type="checkbox"]');
  if (!box) throw new Error("offers checkbox not rendered");
  return box as HTMLInputElement;
};
const submitButton = (): HTMLButtonElement => {
  const btn = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Submit Application");
  if (!btn) throw new Error("Submit button not rendered");
  return btn;
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  h.update.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("v808 Text me offers", () => {
  it("is a separate, unticked, optional box with the carrier wording", async () => {
    await render(completeApplication({ currentStep: 6 }));
    expect(offersBox().checked).toBe(false);
    expect(host.querySelector('[data-testid="marketing-sms-consent"]')?.textContent).toBe(MARKETING_SMS_OPTIN_TEXT);
    expect(MARKETING_SMS_OPTIN_TEXT).toMatch(/Reply STOP to opt out/);
    expect(MARKETING_SMS_OPTIN_TEXT).toMatch(/Not required to apply/);
  });
  it("toggles marketingSmsConsent and never gates submit", async () => {
    await render(completeApplication({ currentStep: 6 }));
    await act(async () => offersBox().click());
    expect(h.update).toHaveBeenCalledWith({ marketingSmsConsent: true });
    expect(submitButton().disabled).toBe(false);
  });
  it("is sent with the application, false unless ticked", () => {
    expect(buildSubmissionPayload(completeApplication()).marketing_sms_consent).toBe(false);
    const ticked = buildSubmissionPayload(completeApplication({ marketingSmsConsent: true }));
    expect(ticked.marketing_sms_consent).toBe(true);
    expect(ticked.signature.marketing_sms_consent).toBe(true);
  });
  it("the ad-measurement box no longer mentions the phone number", async () => {
    await render(completeApplication({ currentStep: 6 }));
    const ad = host.querySelector('[data-testid="ad-measurement-consent"]')?.textContent ?? "";
    expect(ad).toContain("hashed) copy of my email address");
    expect(ad).toContain("my phone number is never shared");
  });
});
