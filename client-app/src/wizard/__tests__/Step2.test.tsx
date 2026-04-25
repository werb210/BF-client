/* @vitest-environment jsdom */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step2_Product } from "../Step2_Product";

type MockProduct = {
  id: string;
  name: string;
  product_type: string;
  lender_id: string;
  amount_min: number;
  amount_max: number;
  required_documents: string[];
};

type MockAppState = {
  currentStep: number;
  kyc: {
    businessLocation: string;
    fundingAmount: string;
    lookingFor: string;
  };
  productRequirements: Record<string, unknown>;
  matchPercentages: Record<string, unknown>;
  linkedApplicationTokens: string[];
  applicationToken: string;
};

type WrapperProps = { children: ReactNode };
type ButtonProps = WrapperProps & Record<string, unknown>;

const updateMock = vi.fn();
const navigateMock = vi.fn();

const mockProducts = (): MockProduct[] => [
  {
    id: "po-short",
    name: "PO",
    product_type: "PO",
    lender_id: "l1",
    amount_min: 1000,
    amount_max: 200000,
    required_documents: [],
  },
  {
    id: "po-long",
    name: "Purchase Order",
    product_type: "PURCHASE_ORDER_FINANCE",
    lender_id: "l2",
    amount_min: 1000,
    amount_max: 200000,
    required_documents: [],
  },
];

const mockAppState = (): MockAppState => ({
  currentStep: 2,
  kyc: {
    businessLocation: "United States",
    fundingAmount: "100000",
    lookingFor: "Purchase Order Financing",
  },
  productRequirements: {},
  matchPercentages: {},
  linkedApplicationTokens: [],
  applicationToken: "token-parent",
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../state/useApplicationStore", () => ({
  useApplicationStore: () => ({
    app: mockAppState(),
    update: updateMock,
  }),
}));

vi.mock("../../api/lenders", () => ({
  getClientLenderProducts: vi.fn(async (): Promise<MockProduct[]> => mockProducts()),
}));

vi.mock("../productSelection", () => ({
  filterActiveProducts: <T,>(rows: T[]): T[] => rows,
  buildCategorySummaries: (): Array<{ matchingCount: number; minAmount: number }> => [],
  groupProductsByLender: (): unknown[] => [],
  getMatchingProducts: (): unknown[] => [],
  isAmountWithinRange: (): boolean => true,
  matchesCountry: (): boolean => true,
  parseCurrencyAmount: (): number => 100000,
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
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn(async (): Promise<void> => undefined) }));
vi.mock("../stepGuard", () => ({ resolveStepGuard: (): number => 2 }));

describe("Step2_Product", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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
