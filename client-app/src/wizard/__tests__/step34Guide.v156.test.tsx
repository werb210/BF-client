// BF_CLIENT_STEP34_GUIDE_v156
// Continue on Steps 3 and 4 is no longer disabled: pressing it is how the
// applicant learns what is missing. It still refuses to advance, names what is
// left in the step's existing error block, and clears that once the step passes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      autosaveError: null,
    }),
  };
});
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/api/clientApp", () => ({ ClientAppAPI: { update: vi.fn(async () => ({})), start: vi.fn(async () => ({})) } }));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/wizard/NaicsPicker", () => ({ NaicsPicker: () => null }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: () => null }));
vi.mock("@/components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import Step3_Business from "../Step3_Business";
import Step4_Applicant from "../Step4_Applicant";

type Part = "business" | "applicant";

const STEPS = [
  { name: "Step 3", Step: Step3_Business, step: 3, part: "business" as Part, blank: ["city", "zip"], labels: ["city", "postal or ZIP code"], next: "/apply/step-4" },
  { name: "Step 4", Step: Step4_Applicant, step: 4, part: "applicant" as Part, blank: ["city", "dob"], labels: ["city", "date of birth"], next: "/apply/step-5" },
];

function appWith(step: number, part: Part, patch: Record<string, unknown>): ApplicationData {
  const app = completeApplication({ currentStep: step });
  return { ...app, [part]: { ...app[part], ...patch } };
}

function renderApp(Step: () => JSX.Element | null, app: ApplicationData) {
  h.state.app = app as unknown as Record<string, unknown>;
  return render(<Step />).container;
}

const continueButton = () => screen.getByRole("button", { name: /^Continue/ }) as HTMLButtonElement;
const errorBlock = (c: HTMLElement) => c.querySelector('[data-error="true"]');

beforeEach(() => {
  localStorage.clear();
  h.update.mockClear();
  h.navigate.mockClear();
});

afterEach(() => cleanup());

describe.each(STEPS)("$name", ({ Step, step, part, blank, labels, next }) => {
  const blanked = () => appWith(step, part, Object.fromEntries(blank.map((k) => [k, ""])));

  it("Continue is not disabled, so the click that explains can happen", () => {
    renderApp(Step, blanked());
    const btn = continueButton();
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-disabled")).toBe("true");
  });

  it("still refuses to advance, and names everything that is missing", () => {
    const c = renderApp(Step, blanked());
    expect(errorBlock(c)).toBeNull();
    fireEvent.click(continueButton());
    expect(h.navigate).not.toHaveBeenCalled();
    expect(errorBlock(c)?.textContent).toBe(`2 things left: ${labels.join(", ")}.`);
  });

  it("says One thing left when only one is missing", () => {
    const c = renderApp(Step, appWith(step, part, { [blank[1]]: "" }));
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe(`One thing left: ${labels[1]}.`);
  });

  it("clears the message once it passes, and advances", async () => {
    const c = renderApp(Step, blanked());
    fireEvent.click(continueButton());
    expect(errorBlock(c)).not.toBeNull();

    act(() => {
      h.update({ [part]: completeApplication()[part] });
    });
    expect(continueButton().getAttribute("aria-disabled")).toBe("false");
    await act(async () => {
      fireEvent.click(continueButton());
    });
    expect(errorBlock(c)).toBeNull();
    expect(h.navigate).toHaveBeenCalledWith(next);
  });
});

describe("Step 4 explains an ownership split, not a blank box", () => {
  const partner = {
    firstName: "Sam", lastName: "Roe", email: "sam@example.com", phone: "4035550000",
    street: "2 Home St", city: "Calgary", state: "AB", zip: "T2P 3C3",
    dob: "1980-01-01", ssn: "130 692 544",
  };

  it("distinguishes a total that does not reach 100 from a missing field", () => {
    const c = renderApp(Step4_Applicant, appWith(4, "applicant", { ownership: "60", partner: { ...partner, ownership: "30" } }));
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe("One thing left: ownership adding up to 100% across every owner.");
  });

  it("names partner fields as partner fields", () => {
    const c = renderApp(Step4_Applicant, appWith(4, "applicant", { ownership: "60", partner: { ...partner, dob: "" , ownership: "40" } }));
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe("One thing left: partner date of birth.");
  });

  it("only asks for partner fields when there is a partner", () => {
    const c = renderApp(Step4_Applicant, appWith(4, "applicant", { ownership: "100", dob: "", partner: {} }));
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe("One thing left: date of birth.");
  });

  it("uses the regional identity label rather than hardcoding SSN", () => {
    let c = renderApp(Step4_Applicant, appWith(4, "applicant", { ssn: "" }));
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe("One thing left: sin.");
    cleanup();

    const us = appWith(4, "applicant", { ssn: "" });
    c = renderApp(Step4_Applicant, { ...us, kyc: { ...us.kyc, businessLocation: "United States" } });
    fireEvent.click(continueButton());
    expect(errorBlock(c)?.textContent).toBe("One thing left: ssn.");
  });
});
