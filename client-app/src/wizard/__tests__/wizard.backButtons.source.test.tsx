// Back-button presence: Step 3 goes back to Step 2 and Step 4 back to Step 3.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { completeApplication } from "@/test/fixtures/completeApplication";

const h = vi.hoisted(() => ({ app: {} as Record<string, unknown>, navigate: vi.fn(), update: vi.fn() }));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<object>("react-router-dom")),
  useNavigate: () => h.navigate,
}));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, update: h.update, autosaveError: null as string | null }),
}));
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

beforeEach(() => {
  localStorage.clear();
  h.navigate.mockClear();
});
afterEach(() => cleanup());

describe("Back-button presence", () => {
  it("Step3_Business renders Back -> step-2", () => {
    h.app = completeApplication({ currentStep: 3 }) as unknown as Record<string, unknown>;
    render(<Step3_Business />);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(h.navigate).toHaveBeenCalledWith("/apply/step-2");
  });

  it("Step4_Applicant renders Back -> step-3", () => {
    h.app = completeApplication({ currentStep: 4 }) as unknown as Record<string, unknown>;
    render(<Step4_Applicant />);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(h.navigate).toHaveBeenCalledWith("/apply/step-3");
  });
});
