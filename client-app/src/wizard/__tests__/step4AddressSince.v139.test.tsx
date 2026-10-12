// BF_CLIENT_STEP4_ADDRESS_SINCE_v139
// Form 912 asks for the prior address only when the owner has been at the
// current one under ten years. Step 4 now collects "At this address since" in
// the 912 block and shows the previous-address field only when it is needed.
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
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: (): null => null }));
vi.mock("@/components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import Step4_Applicant, { underTenYearsAtAddress } from "../Step4_Applicant";

const PREVIOUS = "Previous address, if you have been at your current address under 10 years";

function renderStep4(app: ApplicationData) {
  h.state.app = app as unknown as Record<string, unknown>;
  return render(<Step4_Applicant />).container;
}

function withApplicant(app: ApplicationData, patch: Record<string, unknown>): ApplicationData {
  return { ...app, applicant: { ...app.applicant, ...patch } };
}

const sbaApp = () => completeApplication({ currentStep: 4, productCategory: "SBA", selectedProductType: "SBA" });
// Accord LOC: a Line of Credit selected with an Accord product in the running.
const accordApp = (kyc: Record<string, unknown> = {}) => {
  const app = completeApplication({
    currentStep: 4,
    productCategory: "LOC",
    selectedProductType: "LOC",
    eligibleProducts: [{ isAccord: true }] as unknown as ApplicationData["eligibleProducts"],
  });
  return { ...app, kyc: { ...app.kyc, ...kyc } };
};

const sinceControls = () => screen.queryAllByLabelText("At this address since month");

const ymMonthsAgo = (now: Date, months: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

beforeEach(() => {
  localStorage.clear();
  h.update.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the 912 ten-year rule", () => {
  it("blank keeps the follow-up visible - unanswered is not the same as over ten years", () => {
    expect(underTenYearsAtAddress("")).toBe(true);
    expect(underTenYearsAtAddress(null)).toBe(true);
    expect(underTenYearsAtAddress(undefined)).toBe(true);
  });

  it("an unparseable value keeps it visible rather than hiding a required answer", () => {
    expect(underTenYearsAtAddress("last year")).toBe(true);
    expect(underTenYearsAtAddress("2015")).toBe(true);
  });

  it("recent moves ask for the prior address", () => {
    expect(underTenYearsAtAddress(ymMonthsAgo(new Date(), 36))).toBe(true);
  });

  it("over ten years does not", () => {
    expect(underTenYearsAtAddress(ymMonthsAgo(new Date(), 180))).toBe(false);
  });

  it("the boundary sits at 120 months", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(underTenYearsAtAddress("2016-07")).toBe(true); // 119 months
    expect(underTenYearsAtAddress("2016-06")).toBe(false); // 120 months
  });
});

describe("SBA collects the residence date the 912 needs", () => {
  it("asks for it inside the 912 block and stores what is picked", () => {
    const container = renderStep4(withApplicant(sbaApp(), { addressSince: "" }));
    expect(container.textContent).toContain("SBA personal history (Form 912)");
    expect(sinceControls()).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("At this address since year"), { target: { value: "2020" } });
    fireEvent.change(screen.getByLabelText("At this address since month"), { target: { value: "03" } });

    const last = h.update.mock.calls.at(-1)?.[0] as { applicant: Record<string, unknown> };
    expect(last.applicant.addressSince).toBe("2020-03");
  });

  it("is not asked off the SBA path unless the Accord LOC branch asks it", () => {
    renderStep4(completeApplication({ currentStep: 4 }));
    expect(sinceControls()).toHaveLength(0);
  });

  it("the Accord LOC branch asks it once on its own", () => {
    const container = renderStep4(accordApp());
    expect(container.textContent).not.toContain("SBA personal history (Form 912)");
    expect(sinceControls()).toHaveLength(1);
  });

  it("does not render two controls for the same field when Accord LOC is also on the SBA path", () => {
    const container = renderStep4(accordApp({ purposeOfFunds: "Start up Funding" }));
    expect(container.textContent).toContain("SBA personal history (Form 912)");
    expect(container.textContent).toContain("Own or Rent"); // the Accord branch is on
    expect(sinceControls()).toHaveLength(1);
  });
});

describe("two columns", () => {
  it("former names is paired with the residence date rather than left with an empty cell", () => {
    renderStep4(sbaApp());
    const former = screen.getByText(/Any former names used/).closest("label")?.parentElement as HTMLElement;
    const next = former.nextElementSibling as HTMLElement;
    expect(next.querySelector("label")?.textContent).toBe("At this address since");
    expect(former.style.gridColumn).toBe("");
    expect(next.style.gridColumn).toBe("");
  });

  it("the previous address shows while the date is blank or recent", () => {
    renderStep4(withApplicant(sbaApp(), { addressSince: "" }));
    expect(screen.getByText(PREVIOUS)).toBeTruthy();
    cleanup();
    renderStep4(withApplicant(sbaApp(), { addressSince: ymMonthsAgo(new Date(), 24) }));
    expect(screen.getByText(PREVIOUS)).toBeTruthy();
  });

  it("the previous address is hidden after ten years at the current one", () => {
    renderStep4(withApplicant(sbaApp(), { addressSince: ymMonthsAgo(new Date(), 180) }));
    expect(screen.queryByText(PREVIOUS)).toBeNull();
  });
});
