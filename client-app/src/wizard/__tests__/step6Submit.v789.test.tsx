/* @vitest-environment jsdom */
// BF_CLIENT_v789_STEP_GUARD + BF_CLIENT_v789_SENSITIVE_FIELDS
// Step 6 submit re-checks Steps 1-4 with the rules their Continue buttons use
// and names the incomplete step; a successful submit leaves no application
// data on the device.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const api = vi.hoisted(() => ({
  submit: vi.fn(async () => ({ data: { submissionId: "sub-1" } })),
  status: vi.fn(async () => ({ data: {} })),
  update: vi.fn(async () => ({})),
  updateApplication: vi.fn(async () => ({})),
  uploadDoc: vi.fn(async () => ({})),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigateMock,
}));
vi.mock("@/api/auth", () => ({ hasToken: () => false }));
vi.mock("../../api/clientApp", () => ({ ClientAppAPI: api }));
vi.mock("../../api/client", () => ({ apiCall: vi.fn(async () => ({ count: 0 })) }));
vi.mock("../../utils/submitAttempt", () => ({ sendSubmitAttempt: vi.fn() }));
vi.mock("@/lib/journey", () => ({ trackApplicationSubmitted: vi.fn(), trackWizardStep: vi.fn() }));
vi.mock("../../lib/journey", () => ({ trackApplicationSubmitted: vi.fn(), trackWizardStep: vi.fn() }));
vi.mock("../../client/autosave", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../client/autosave")>();
  return { ...actual, patchApplication: vi.fn(async () => ({})) };
});

import { Step6_Review } from "../Step6_Review";
import { __resetSingletonForTests, applyBrokerPrefill } from "../../state/useApplicationStore";
import { saveStepData } from "../../client/autosave";
import { APP_TOKEN, completeApplication } from "@/test/fixtures/completeApplication";
import type { ApplicationData } from "@/types/application";

function storedText(): string {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) out.push(`${key}=${localStorage.getItem(key)}`);
  }
  return out.join("\n");
}

describe("Step 6 submit", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })));
    localStorage.clear();
    sessionStorage.clear();
    navigateMock.mockReset();
    Object.values(api).forEach((fn) => fn.mockClear());
    __resetSingletonForTests();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function renderWith(app: ApplicationData) {
    act(() => applyBrokerPrefill(APP_TOKEN, app));
    await act(async () => { root.render(<Step6_Review />); });
  }

  function submitButton(): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find((b) => /Submit Application/.test(b.textContent || ""));
    if (!button) throw new Error("Submit Application not rendered");
    return button;
  }

  it("refuses to submit with the SIN missing and names Step 4", async () => {
    const app = completeApplication();
    await renderWith({ ...app, applicant: { ...app.applicant, ssn: "" } });
    await act(async () => { submitButton().click(); });

    expect(api.submit).not.toHaveBeenCalled();
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Step 4 (Applicant Information) is incomplete");
    expect(alert?.textContent).toContain("SIN / SSN");

    const goTo = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Go to Step 4");
    expect(goTo).toBeTruthy();
    await act(async () => { goTo!.click(); });
    expect(navigateMock).toHaveBeenCalledWith("/apply/step-4");
  });

  it("refuses to submit when Step 1 is empty and names Step 1 first", async () => {
    await renderWith(completeApplication({ kyc: {} }));
    await act(async () => { submitButton().click(); });
    expect(api.submit).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Step 1 (Financial Profile) is incomplete");
  });

  it("submits a complete application and leaves no application data in storage", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    await renderWith(completeApplication());
    saveStepData(3, { businessName: "Acme Ltd" });
    expect(storedText()).toContain("Acme Ltd");

    await act(async () => { submitButton().click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(api.submit).toHaveBeenCalledTimes(1);
    const body = (api.submit.mock.calls[0] as unknown[])[1] as { app: { applicant: Record<string, unknown> } };
    // The server still gets every answer, including the SIN.
    expect(body.app.applicant.ssn).toBe("046 454 286");

    for (const key of ["application_state", "client_backup", "boreal_app_cache", "bf_pending_submit"]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      expect(localStorage.key(i)).not.toMatch(/^client:draft:/);
    }
    expect(storedText()).not.toContain("Acme Ltd");
    expect(storedText()).not.toContain("046 454 286");
  });
});
