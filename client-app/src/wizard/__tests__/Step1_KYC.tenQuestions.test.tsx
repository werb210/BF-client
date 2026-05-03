import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const mockAppState = {
  currentStep: 1,
  kyc: { lookingFor: "" },
  business: {},
  applicant: {},
};

type AutosaveError = { message: string } | null;
const store: {
  autosaveError: AutosaveError;
  app: typeof mockAppState;
  update: (patch: Record<string, unknown>) => void;
} = {
  autosaveError: null,
  app: mockAppState,
  update: (_patch: Record<string, unknown>): void => undefined,
};

vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: (): typeof store => store,
}));

vi.mock("../../state/readinessStore", () => ({
  useReadiness: (): null => null,
  setReadiness: vi.fn(),
}));

vi.mock("../../services/creditPrefill", () => ({
  fetchCreditPrefill: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/api/readiness", () => ({
  fetchReadinessPrefill: vi.fn().mockResolvedValue({ found: false }),
}));

vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn() }));
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

import { Step1_KYC } from "../Step1_KYC";

function renderStep1() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Step1_KYC />);
  });

  return { container, root };
}

describe("Step1_KYC ten questions", () => {
  beforeEach(() => {
    updateMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders all 10 step-1 fields for each lookingFor value", () => {
    const scenarios = [
      { lookingFor: "Working Capital", amountFields: ["fundingAmount"] },
      { lookingFor: "Equipment", amountFields: ["equipmentAmount"] },
      { lookingFor: "Both", amountFields: ["fundingAmount", "equipmentAmount"] },
      { lookingFor: undefined, amountFields: ["fundingAmount"] },
    ];

    for (const scenario of scenarios) {
      mockAppState.kyc = { lookingFor: scenario.lookingFor as string | undefined } as any;
      const { container, root } = renderStep1();

      [
        "lookingFor",
        "businessLocation",
        "industry",
        "purposeOfFunds",
        "salesHistory",
        "revenueLast12Months",
        "monthlyRevenue",
        "accountsReceivable",
        "fixedAssets",
      ].forEach((fieldKey) => {
        expect(container.querySelector(`#step1-${fieldKey}`)).toBeTruthy();
      });
      scenario.amountFields.forEach((fieldKey) => {
        expect(container.querySelector(`#step1-${fieldKey}`)).toBeTruthy();
      });

      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("includes expanded Purpose of Funds options", () => {
    mockAppState.kyc = { lookingFor: "Working Capital" } as any;
    const { container, root } = renderStep1();

    const purposeSelect = container.querySelector(
      "#step1-purposeOfFunds"
    ) as HTMLSelectElement | null;

    expect(purposeSelect).toBeTruthy();

    const values = Array.from(purposeSelect?.options ?? []).map((option) => option.value);
    expect(values).toContain("Working Capital");
    expect(values).toContain("Funds to cover A/R");
    expect(values).toContain("Buy Inventory");
    expect(values).toContain("Expansion");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
