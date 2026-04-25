/* @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step2_Product } from "../Step2_Product";

const updateMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: () => ({
    app: {
      currentStep: 2,
      kyc: { businessLocation: "United States", fundingAmount: "100000", lookingFor: "Purchase Order Financing" },
      productRequirements: {},
      matchPercentages: {},
      linkedApplicationTokens: [],
      applicationToken: "token-parent",
    },
    update: updateMock,
  }),
}));

vi.mock("../../api/lenders", () => ({
  getClientLenderProducts: vi.fn(async () => [
    { id: "po-short", name: "PO", product_type: "PO", lender_id: "l1", amount_min: 1000, amount_max: 200000, required_documents: [] },
    { id: "po-long", name: "Purchase Order", product_type: "PURCHASE_ORDER_FINANCE", lender_id: "l2", amount_min: 1000, amount_max: 200000, required_documents: [] },
  ]),
}));
vi.mock("../productSelection", () => ({
  filterActiveProducts: (rows: any[]) => rows,
  buildCategorySummaries: () => [],
  groupProductsByLender: () => [],
  getMatchingProducts: () => [],
  isAmountWithinRange: () => true,
  matchesCountry: () => true,
  parseCurrencyAmount: () => 100000,
}));

vi.mock("../../components/StepHeader", () => ({ StepHeader: () => <div /> }));
vi.mock("../../components/WizardLayout", () => ({ WizardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("../../components/ui/Card", () => ({ Card: ({ children }: any) => <div>{children}</div> }));
vi.mock("../../components/ui/Button", () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock("../../components/ui/EmptyState", () => ({ EmptyState: ({ children }: any) => <div>{children}</div> }));
vi.mock("../../components/ui/Spinner", () => ({ Spinner: () => <div /> }));
vi.mock("../../applications/linkedApplications", () => ({
  createLinkedApplication: vi.fn(),
  LinkedApplicationStore: { has: () => false },
}));
vi.mock("../../state/clientProfiles", () => ({ ClientProfileStore: { upsertProfile: vi.fn() } }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));

vi.mock("../stepGuard", () => ({ resolveStepGuard: () => 2 }));

describe("Step2_Product", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    updateMock.mockReset();
    navigateMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("renders one canonical bucket card for PO + PURCHASE_ORDER_FINANCE", async () => {
    await act(async () => {
      root.render(<Step2_Product />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const text = container.textContent || "";
    expect(text).toContain("Purchase Order Financing");
    expect(text).toContain("2 products available");
    expect(text).not.toContain("PURCHASE_ORDER_FINANCE");

    root.unmount();
    container.remove();
  });
});
