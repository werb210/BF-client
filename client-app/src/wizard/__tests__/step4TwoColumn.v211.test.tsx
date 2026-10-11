// BF_CLIENT_STEP4_TWO_COLUMN_v211
// The Step 4 owner grid has always been two columns. What read as one column
// was the Form 912 block, where every question carried gridColumn "1 / -1".
// Those questions now take one cell each; section headings and address lines
// still span the row.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
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
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: () => null }));
vi.mock("@/components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import Step4_Applicant from "../Step4_Applicant";

function renderStep4(app: ApplicationData) {
  h.state.app = app as unknown as Record<string, unknown>;
  return render(<Step4_Applicant />).container;
}

// The cell a field occupies in the grid: the element wrapping its label.
function cellOf(container: HTMLElement, labelText: string): HTMLElement {
  const label = Array.from(container.querySelectorAll("label")).find((l) =>
    (l.textContent || "").includes(labelText),
  );
  if (!label?.parentElement) throw new Error(`no field labelled "${labelText}"`);
  return label.parentElement;
}

function sbaApp(): ApplicationData {
  return completeApplication({ currentStep: 4, productCategory: "SBA", selectedProductType: "SBA" });
}

const originalWidth = window.innerWidth;

beforeEach(() => {
  localStorage.clear();
  h.update.mockClear();
  h.navigate.mockClear();
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: originalWidth });
});

describe("Form 912 questions", () => {
  it.each([
    "Are you currently incarcerated, serving a sentence, or under indictment",
    "In the past year, have you been convicted of a criminal offence",
    "Are you currently more than 60 days late on any child support",
    "Your initials, confirming the three answers above",
  ])("%s takes one cell, not the whole row", (marker) => {
    const container = renderStep4(sbaApp());
    expect(cellOf(container, marker).style.gridColumn).toBe("");
  });
});

describe("what stays full width", () => {
  it("section headings still span both columns", () => {
    const container = renderStep4(sbaApp());
    const heading = Array.from(container.querySelectorAll("div")).find(
      (d) => d.textContent?.trim() === "SBA personal history (Form 912)",
    );
    expect(heading?.style.gridColumn).toBe("1 / -1");
  });

  it("the mailing address keeps its width", () => {
    const app = completeApplication({
      currentStep: 4,
      productCategory: "LOC",
      eligibleProducts: [{ isAccord: true }] as unknown as ApplicationData["eligibleProducts"],
    });
    app.applicant = { ...app.applicant, mailingSameAsPhysical: false };
    const container = renderStep4(app);
    expect(cellOf(container, "Mailing Address").style.gridColumn).toBe("1 / -1");
  });

  it("the previous-address free text keeps its width", () => {
    const container = renderStep4(sbaApp());
    expect(
      cellOf(container, "Previous address, if you have been at your current address").style.gridColumn,
    ).toBe("1 / -1");
  });
});

describe("the container itself", () => {
  it("is two columns on a wide screen", () => {
    const container = renderStep4(sbaApp());
    const grid = cellOf(container, "Your initials, confirming").parentElement as HTMLElement;
    expect(grid.style.display).toBe("grid");
    expect(grid.style.gridTemplateColumns).toBe("1fr 1fr");
  });

  it("drops to one column on a phone", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 400 });
    const container = renderStep4(sbaApp());
    const grid = cellOf(container, "Your initials, confirming").parentElement as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("1fr");
  });
});
