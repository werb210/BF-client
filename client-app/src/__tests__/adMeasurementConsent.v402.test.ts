// BF_CLIENT_AD_MEASUREMENT_CONSENT_v402
// The ad-measurement box on Step 6 is optional: unticked by default, it never
// gates Submit, and the server receives false unless it was ticked.
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

import { Step6_Review } from "@/wizard/Step6_Review";

let host: HTMLDivElement;
let root: Root;

async function render(app: ApplicationData): Promise<void> {
  h.app = app;
  await act(async () => {
    root.render(createElement(Step6_Review));
  });
}

function adBox(): HTMLInputElement {
  const box = host.querySelector('[data-testid="ad-measurement-consent"] input[type="checkbox"]');
  if (!box) throw new Error("ad-measurement checkbox not rendered");
  return box as HTMLInputElement;
}

function submitButton(): HTMLButtonElement {
  const btn = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Submit Application");
  if (!btn) throw new Error("Submit button not rendered");
  return btn;
}

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

describe("ad-measurement consent", () => {
  it("is an unticked optional checkbox on Step 6", async () => {
    await render(completeApplication({ currentStep: 6 }));
    expect(adBox().checked).toBe(false);
    expect(host.querySelector('[data-testid="ad-measurement-consent"]')?.textContent).toMatch(/^Optional:/);
  });

  it("toggles adMeasurementConsent in the store", async () => {
    await render(completeApplication({ currentStep: 6 }));
    await act(async () => adBox().click());
    expect(h.update).toHaveBeenCalledWith({ adMeasurementConsent: true });

    h.update.mockReset();
    await render(completeApplication({ currentStep: 6, adMeasurementConsent: true }));
    expect(adBox().checked).toBe(true);
    await act(async () => adBox().click());
    expect(h.update).toHaveBeenCalledWith({ adMeasurementConsent: false });
  });

  it("does not gate submit", async () => {
    await render(completeApplication({ currentStep: 6, adMeasurementConsent: false }));
    expect(submitButton().disabled).toBe(false);
  });

  it("is sent with the application, false unless ticked", () => {
    expect(buildSubmissionPayload(completeApplication()).ad_measurement_consent).toBe(false);
    expect(buildSubmissionPayload(completeApplication({ adMeasurementConsent: false })).ad_measurement_consent).toBe(false);
    expect(buildSubmissionPayload(completeApplication({ adMeasurementConsent: true })).ad_measurement_consent).toBe(true);
  });
});
