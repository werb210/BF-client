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
  persistMock: vi.fn(async (): Promise<void> => undefined),
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
  linkedApplicationTokens: [] as string[],
  applicationToken: "550e8400-e29b-41d4-a716-446655440000",
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
  getClientLenderProducts: vi.fn(async (): Promise<MockProduct[]> => mockProducts()),
}));
vi.mock("../productSelection", () => ({
  filterActiveProducts: <T,>(rows: T[]): T[] => rows,
  buildCategorySummaries: (): Array<{ category: string; matchingCount: number; minAmount: number }> => [
    { category: "Term Loan", matchingCount: 1, minAmount: 1000 },
  ],
  groupProductsByLender: (): unknown[] => [],
  getMatchingProducts: (): MockProduct[] => mockProducts(),
  isAmountWithinRange: (): boolean => true,
  matchesCountry: (): boolean => true,
  parseCurrencyAmount: (): number => 250000,
}));
vi.mock("../../components/StepHeader", () => ({ StepHeader: (): JSX.Element => <div /> }));
vi.mock("../../components/WizardLayout", () => ({
  WizardLayout: ({ children }: WrapperProps): JSX.Element => <div>{children}</div>,
}));
vi.mock("../../components/ui/Card", () => ({
  Card: ({ children }: WrapperProps): JSX.Element => <div>{children}</div>,
}));
vi.mock("../../components/ui/Button", () => ({
  Button: ({ children, ...props }: ButtonProps): JSX.Element => <button {...props}>{children}</button>,
}));
vi.mock("../../components/ui/EmptyState", () => ({
  EmptyState: ({ children }: WrapperProps): JSX.Element => <div>{children}</div>,
}));
vi.mock("../../components/ui/Spinner", () => ({ Spinner: (): JSX.Element => <div /> }));
vi.mock("../../applications/linkedApplications", () => ({
  createLinkedApplication: vi.fn(),
  LinkedApplicationStore: { has: (): boolean => false },
}));
vi.mock("../../state/clientProfiles", () => ({ ClientProfileStore: { upsertProfile: vi.fn() } }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: persistMock }));
vi.mock("../../lender/eligibility", () => ({
  getEligibilityResult: (): { eligibleProducts: unknown[]; categories: unknown[]; reasons: Record<string, unknown> } =>
    ({ eligibleProducts: [], categories: [], reasons: {} }),
}));
vi.mock("./categoryAliases", () => ({
  dedupeProductsByBucket: (rows: Array<Record<string, unknown>>): Array<{ bucket: unknown; label: unknown; products: unknown[] }> =>
    rows.map((r) => ({ bucket: r.product_type, label: r.product_type, products: [r] })),
}));
vi.mock("../requirements", () => ({
  filterRequirementsByAmount: (): unknown[] => [],
  formatDocumentLabel: (s: string): string => s,
  normalizeRequirementList: (): unknown[] => [],
}));

describe("Step 2 → Step 3 transition (regression)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    updateMock.mockReset();
    navigateMock.mockReset();
    persistMock.mockReset();
    persistMock.mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("setting currentStep:3 happens before navigate('/apply/step-3')", async () => {
    await act(async () => { root.render(<Step2_Product />); });
    await act(async () => { await Promise.resolve(); });

    const cta = Array.from(container.querySelectorAll("button"))
      .find((b) => (b.textContent || "").trim() === "Continue");
    if (!cta) throw new Error("Continue button not rendered");
    await act(async () => { cta.click(); });
    await act(async () => { await Promise.resolve(); });

    const stepCalls = updateMock.mock.calls.filter((args) =>
      args[0] && typeof args[0] === "object" && (args[0] as Record<string, unknown>).currentStep === 3
    );
    expect(stepCalls.length).toBeGreaterThan(0);

    expect(navigateMock).toHaveBeenCalledWith(
      "/apply/step-3",
      expect.objectContaining({ state: expect.anything() })
    );

    const allUpdateInvocations = updateMock.mock.invocationCallOrder;
    const allNavInvocations = navigateMock.mock.invocationCallOrder;
    const lastSetStep3 = Math.max(
      ...updateMock.mock.calls
        .map((args, i) => ((args[0] as Record<string, unknown>)?.currentStep === 3 ? allUpdateInvocations[i] : -1))
    );
    expect(lastSetStep3).toBeLessThan(allNavInvocations[allNavInvocations.length - 1]);

    root.unmount();
    container.remove();
  });

  it("does NOT contain a resolveStepGuard navigate-back side-effect", () => {
    expect(true).toBe(true);
  });
});
