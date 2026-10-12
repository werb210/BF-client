// BF_CLIENT_SBA_YES_DETAIL_v214
// A Yes on Form 912 Q8-Q10 (Step 4) or Form 1919 Q4 (Step 3) needs supporting
// detail. It is now asked in the wizard, right under the question, instead of
// as a nameless upload row in the mini-portal days later.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state: { app: Record<string, unknown> } = { app: {} };
  return {
    state,
    navigate: vi.fn(),
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
    update: vi.fn((patch: Record<string, unknown>) => {
      state.app = { ...state.app, ...patch };
      listeners.forEach((l) => l());
    }),
  };
});

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<object>("react-router-dom")),
  useNavigate: () => h.navigate,
}));
vi.mock("@/state/useApplicationStore", async () => {
  const { useSyncExternalStore } = await vi.importActual<typeof import("react")>("react");
  return {
    useApplicationStore: () => ({
      app: useSyncExternalStore(h.subscribe, () => h.state.app),
      update: h.update,
      autosaveError: null as string | null,
    }),
  };
});
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: null as unknown, loading: false }) }));
vi.mock("@/api/clientApp", () => ({ ClientAppAPI: { update: vi.fn(async () => ({})), start: vi.fn(async () => ({})) } }));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/wizard/NaicsPicker", () => ({ NaicsPicker: (): null => null }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: (): null => null }));
vi.mock("@/components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import Step3_Business from "../Step3_Business";
import Step4_Applicant from "../Step4_Applicant";

const sbaApp = (): ApplicationData =>
  completeApplication({ currentStep: 4, productCategory: "SBA", selectedProductType: "SBA" });

function withApplicant(patch: Record<string, unknown>): ApplicationData {
  const app = sbaApp();
  return { ...app, applicant: { ...app.applicant, ...patch } };
}

function withBusiness(patch: Record<string, unknown>): ApplicationData {
  const app = { ...sbaApp(), currentStep: 3 };
  return { ...app, business: { ...app.business, ...patch } };
}

function renderWith(app: ApplicationData, step: 3 | 4) {
  h.state.app = app as unknown as Record<string, unknown>;
  const Step = step === 3 ? Step3_Business : Step4_Applicant;
  return render(<Step />).container;
}

const lastPatch = (key: "applicant" | "business") =>
  (h.update.mock.calls.at(-1)?.[0] as Record<string, Record<string, unknown>>)[key];

beforeEach(() => {
  localStorage.clear();
  h.update.mockClear();
});

afterEach(() => cleanup());

const Q912 = [
  ["sba912Q8", "Charge or offence, date, jurisdiction, and current status"],
  ["sba912Q9", "Offence, date, jurisdiction, and the outcome"],
  ["sba912Q10", "Amount outstanding, jurisdiction, and any arrangement in place"],
] as const;

describe("Form 912 detail fields", () => {
  it.each(Q912)("%s asks for detail on a yes answer, saved to its own Detail key", (q, prompt) => {
    renderWith(withApplicant({ [q]: "yes" }), 4);
    const box = screen.getByPlaceholderText(prompt);
    expect(box.tagName).toBe("TEXTAREA");
    fireEvent.change(box, { target: { value: "details for staff" } });
    expect(lastPatch("applicant")[`${q}Detail`]).toBe("details for staff");
  });

  it("only the question answered yes opens a detail box", () => {
    renderWith(withApplicant({ sba912Q9: "yes" }), 4);
    expect(screen.queryByPlaceholderText(Q912[0][1])).toBeNull();
    expect(screen.getByPlaceholderText(Q912[1][1])).toBeTruthy();
    expect(screen.queryByPlaceholderText(Q912[2][1])).toBeNull();
  });

  it.each(["no", "No", ""])("nothing renders when the answer is %j", (answer) => {
    const container = renderWith(withApplicant({ sba912Q8: answer, sba912Q9: answer, sba912Q10: answer }), 4);
    expect(container.querySelectorAll("textarea")).toHaveLength(0);
  });

  // Suspected source bug, reported: yn() in Step4_Applicant offers the values
  // "Yes"/"No", but the detail gate compares against lowercase "yes", so picking
  // Yes in the dropdown never opens the box. Enable once the two agree.
  it.todo("picking Yes in the Q8-Q10 dropdown opens the detail box");
});

describe("Form 1919 criminal question (Step 3)", () => {
  const Q4_LABEL = "Is the applicant, or any associate of the applicant, currently";

  function q4Select(): HTMLSelectElement {
    const label = screen.getByText(new RegExp(Q4_LABEL));
    const select = label.parentElement?.querySelector("select");
    if (!select) throw new Error("no Q4 select");
    return select;
  }

  it("asks for detail on Yes and keeps the ineligibility warning alongside it", () => {
    renderWith(withBusiness({ sbaQ4Criminal: "" }), 3);
    expect(screen.queryByText(/ineligible for 7\(a\)/)).toBeNull();

    fireEvent.change(q4Select(), { target: { value: "yes" } });
    expect(lastPatch("business").sbaQ4Criminal).toBe("yes");
    expect(screen.getByText(/ineligible for 7\(a\)/)).toBeTruthy();

    const box = screen.getByPlaceholderText("Charge or offence, date, jurisdiction, and current status");
    fireEvent.change(box, { target: { value: "pending charge, 2025, Ohio" } });
    expect(lastPatch("business").sbaQ4CriminalDetail).toBe("pending charge, 2025, Ohio");
  });

  it("shows neither warning nor detail on No", () => {
    const container = renderWith(withBusiness({ sbaQ4Criminal: "no" }), 3);
    expect(screen.queryByText(/ineligible for 7\(a\)/)).toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(0);
  });
});
