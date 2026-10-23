/* @vitest-environment jsdom */
// BF_CLIENT_v851_APPLICANT_NAME - prefill fills only empty fields and never uses "Unknown (application started)".
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  updateMock: vi.fn(),
  applicant: {} as Record<string, unknown>,
  readiness: null as null | Record<string, unknown>,
}));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual("react-router-dom")), useNavigate: () => vi.fn() }));
vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: { currentStep: 4, applicationToken: "t", applicant: h.applicant, business: {}, kyc: {} }, update: h.updateMock, autosaveError: null as string | null }),
}));
vi.mock("../../state/readinessStore", () => ({ useReadiness: () => h.readiness, setReadiness: vi.fn() }));
vi.mock("../../api/clientApp", () => ({ ClientAppAPI: { update: vi.fn(), start: vi.fn() } }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../../components/StepHeader", () => ({ StepHeader: (): JSX.Element => <div /> }));
vi.mock("../../components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div> }));
vi.mock("../../components/ui/Card", () => ({ Card: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div> }));
vi.mock("../../components/ui/Button", () => ({ Button: ({ children, ...props }: any): JSX.Element => <button {...props}>{children}</button> }));

import Step4_Applicant from "../Step4_Applicant";
import { fillEmptyText, fillName, isPlaceholderName, prefillName, splitName } from "../applicantName";

const PLACEHOLDER = "Unknown (application started)";

function applicantUpdates(): Record<string, unknown>[] {
  return h.updateMock.mock.calls.map((c) => (c[0] as { applicant?: Record<string, unknown> }).applicant).filter(Boolean) as Record<string, unknown>[];
}

describe("v851 applicant name helpers", () => {
  it("recognises the placeholder and never returns it as a prefill name", () => {
    for (const v of ["Unknown", "(application started)", PLACEHOLDER, " unknown  (APPLICATION STARTED) "]) {
      expect(isPlaceholderName(v)).toBe(true);
      expect(prefillName(v)).toBeUndefined();
    }
    expect(prefillName("  Jordan  Rivers ")).toBe("Jordan Rivers");
    expect(splitName("Jordan P Rivers")).toEqual({ first: "Jordan", last: "P Rivers" });
  });
  it("typed values win; the placeholder counts as empty", () => {
    expect(fillName("Taylor", "Jordan")).toBe("Taylor");
    expect(fillName("", "Jordan")).toBe("Jordan");
    expect(fillName(undefined, PLACEHOLDER)).toBeUndefined();
    expect(fillName("Unknown", "Jordan")).toBe("Jordan");
    expect(fillName("(application started)", undefined)).toBe("");
    expect(fillEmptyText("me@x.co", "other@x.co")).toBe("me@x.co");
    expect(fillEmptyText("", "other@x.co")).toBe("other@x.co");
  });
});

describe("v851 Step 4 prefill", () => {
  let c: HTMLDivElement;
  let r: Root;
  beforeEach(() => {
    h.updateMock.mockReset();
    h.readiness = null;
    h.applicant = {};
    localStorage.removeItem("creditPrefill");
    c = document.createElement("div");
    document.body.appendChild(c);
    r = createRoot(c);
  });
  afterEach(() => {
    act(() => r.unmount());
    c.remove();
    localStorage.removeItem("creditPrefill");
  });
  const render = async () => { await act(async () => { r.render(<Step4_Applicant />); }); };

  it("does not overwrite what the applicant typed with the readiness name, email or phone", async () => {
    h.applicant = { firstName: "Taylor", lastName: "Doe", fullName: "Taylor Doe", email: "taylor@example.com", phone: "4035551234" };
    h.readiness = { leadId: "l1", fullName: "Bob Smith", email: "bob@example.com", phone: "7805550000" };
    await render();
    for (const a of applicantUpdates()) {
      expect(a).toMatchObject({ firstName: "Taylor", lastName: "Doe", fullName: "Taylor Doe", email: "taylor@example.com", phone: "4035551234" });
    }
  });

  it("never fills the placeholder name, and still fills an empty email", async () => {
    h.applicant = {};
    h.readiness = { leadId: "l1", fullName: PLACEHOLDER, email: "jordan@rivers.co" };
    await render();
    const all = JSON.stringify(h.updateMock.mock.calls);
    expect(all).not.toContain("application started");
    expect(all).not.toContain("Unknown");
    expect(applicantUpdates().some((a) => a.email === "jordan@rivers.co")).toBe(true);
  });

  it("fills empty name fields from a real readiness name", async () => {
    h.applicant = {};
    h.readiness = { leadId: "l1", fullName: "Jordan Rivers" };
    await render();
    expect(applicantUpdates().some((a) => a.firstName === "Jordan" && a.lastName === "Rivers" && a.fullName === "Jordan Rivers")).toBe(true);
  });

  it("clears a placeholder already in the form instead of keeping it", async () => {
    h.applicant = { firstName: "Unknown", lastName: "(application started)", fullName: PLACEHOLDER };
    h.readiness = { leadId: "l1", fullName: PLACEHOLDER };
    await render();
    const last = applicantUpdates().pop();
    expect(last).toMatchObject({ firstName: "", lastName: "", fullName: "" });
  });

  it("the website credit prefill also fills only empty fields and ignores the placeholder", async () => {
    h.applicant = { firstName: "Taylor", lastName: "Doe" };
    localStorage.setItem("creditPrefill", JSON.stringify({ fullName: "Bob Smith", email: "bob@example.com" }));
    await render();
    for (const a of applicantUpdates()) expect(a).toMatchObject({ firstName: "Taylor", lastName: "Doe" });
    expect(applicantUpdates().some((a) => a.email === "bob@example.com")).toBe(true);

    act(() => r.unmount());
    h.updateMock.mockReset();
    h.applicant = {};
    localStorage.setItem("creditPrefill", JSON.stringify({ fullName: PLACEHOLDER }));
    r = createRoot(c);
    await render();
    expect(JSON.stringify(h.updateMock.mock.calls)).not.toContain("application started");
  });
});
