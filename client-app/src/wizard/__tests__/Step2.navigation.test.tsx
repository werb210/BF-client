/* @vitest-environment jsdom */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step2_Product } from "../Step2_Product";

type MockProduct = {
  id: string; name: string; product_type: string; lender_id: string;
  amount_min: number; amount_max: number; required_documents: string[];
};
type WrapperProps = { children: ReactNode };
type ButtonProps = WrapperProps & Record<string, unknown>;

const { updateMock, navigateMock, persistMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  navigateMock: vi.fn(),
  persistMock: vi.fn(),
}));

const mockProducts = (): MockProduct[] => [{
  id: "tl-1", name: "Term Loan", product_type: "Term Loan",
  lender_id: "l1", amount_min: 1000, amount_max: 500000, required_documents: [],
}];

const mockAppState = () => ({
  currentStep: 2,
  kyc: { businessLocation: "Canada", fundingAmount: "250000", lookingFor: "Capital" },
  productRequirements: {},
  matchPercentages: {},
  linkedApplicationTokens: [],
  applicationToken: "local-1768585153909", // placeholder, like a stale draft
  productCategory: "Term Loan",
  selectedProduct: { id: "tl-1", name: "Term Loan", product_type: "Term Loan", lender_id: "l1" },
  selectedProductId: "tl-1",
  selectedProductType: "Term Loan",
});

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigateMock,
}));
vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: mockAppState(), update: updateMock }),
}));
vi.mock("../../api/lenders", () => ({
  getClientLenderProducts: vi.fn(async () => mockProducts()),
}));
vi.mock("../productSelection", () => ({
  filterActiveProducts: <T,>(rows: T[]): T[] => rows,
  buildCategorySummaries: () => [{ category: "Term Loan", matchingCount: 1, minAmount: 1000 }],
  groupProductsByLender: () => [],
  getMatchingProducts: () => mockProducts(),
  isAmountWithinRange: () => true,
  matchesCountry: () => true,
  parseCurrencyAmount: () => 250000,
}));
vi.mock("../../components/StepHeader", () => ({ StepHeader: () => <div /> }));
vi.mock("../../components/WizardLayout", () => ({
  WizardLayout: ({ children }: WrapperProps) => <div>{children}</div>,
}));
vi.mock("../../components/ui/Card", () => ({ Card: ({ children }: WrapperProps) => <div>{children}</div> }));
vi.mock("../../components/ui/Button", () => ({
  Button: ({ children, ...props }: ButtonProps) => <button {...props}>{children}</button>,
}));
vi.mock("../../components/ui/EmptyState", () => ({
  EmptyState: ({ children }: WrapperProps) => <div>{children}</div>,
}));
vi.mock("../../components/ui/Spinner", () => ({ Spinner: () => <div /> }));
vi.mock("../../applications/linkedApplications", () => ({
  createLinkedApplication: vi.fn(),
  LinkedApplicationStore: { has: () => false },
}));
vi.mock("../../state/clientProfiles", () => ({ ClientProfileStore: { upsertProfile: vi.fn() } }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: persistMock }));
vi.mock("../stepGuard", () => ({ resolveStepGuard: () => 2 }));
vi.mock("../../lender/eligibility", () => ({
  getEligibilityResult: () => ({ eligibleProducts: [], categories: [], reasons: {} }),
}));
vi.mock("./categoryAliases", () => ({
  dedupeProductsByBucket: (rows: any[]) => rows.map((r) => ({
    bucket: r.product_type, label: r.product_type, products: [r],
  })),
}));
vi.mock("../requirements", () => ({
  filterRequirementsByAmount: () => [],
  formatDocumentLabel: (s: string) => s,
  normalizeRequirementList: () => [],
}));

async function clickContinue(container: HTMLElement) {
  const buttons = Array.from(container.querySelectorAll("button"));
  const cta = buttons.find((b) => (b.textContent || "").trim() === "Continue");
  if (!cta) throw new Error("Continue button not rendered");
  await act(async () => { cta.click(); });
}

describe("Step2 Continue navigation (regression)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    updateMock.mockReset();
    navigateMock.mockReset();
    persistMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("navigates to /apply/step-3 even if persistApplicationStep rejects", async () => {
    persistMock.mockRejectedValue(new Error("simulated 500"));

    await act(async () => { root.render(<Step2_Product />); });
    await act(async () => { await Promise.resolve(); });

    await clickContinue(container);
    await act(async () => { await Promise.resolve(); });

    expect(navigateMock).toHaveBeenCalledWith(
      "/apply/step-3",
      expect.objectContaining({ state: expect.objectContaining({ bucket: "Term Loan" }) })
    );

    root.unmount();
    container.remove();
  });

  it("navigates to /apply/step-3 when persist resolves normally", async () => {
    persistMock.mockResolvedValue(undefined);

    await act(async () => { root.render(<Step2_Product />); });
    await act(async () => { await Promise.resolve(); });

    await clickContinue(container);
    await act(async () => { await Promise.resolve(); });

    expect(navigateMock).toHaveBeenCalledWith("/apply/step-3", expect.anything());

    root.unmount();
    container.remove();
  });
});
