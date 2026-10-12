/* @vitest-environment jsdom */
// BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1 (supersedes v119 always-required appendage)
// BF_CLIENT_BLOCK_v119_STEP5_PREFER_SERVER_REQUIRED_DOCS_v1 - Step 5 takes its
// required documents from the server's required-docs union first, and only
// falls back to aggregating the cached lender products when the server returns
// nothing.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";
import { aggregateRequiredDocuments } from "../../documents/requiredDocuments";

const h = vi.hoisted(() => {
  let state = {} as ApplicationData;
  const listeners = new Set<() => void>();
  return {
    navigate: vi.fn(),
    update: vi.fn((patch: Partial<ApplicationData>) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    }),
    set(next: ApplicationData) { state = next; },
    get: (): ApplicationData => state,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    fetchDocs: vi.fn(),
    products: [] as unknown[],
  };
});

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/state/useApplicationStore", async () => {
  const React = await import("react");
  return {
    useApplicationStore: () => ({ app: React.useSyncExternalStore(h.subscribe, h.get), update: h.update }),
  };
});
vi.mock("@/api/lenderProducts", () => ({ fetchRequiredDocsUnion: h.fetchDocs }));
vi.mock("@/lender/productSync", () => ({
  ProductSync: { load: (): unknown[] => h.products, sync: async (): Promise<unknown[]> => h.products },
}));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: { status: vi.fn(async () => ({ data: {} })), deferDocuments: vi.fn(async () => ({})) },
}));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: (): JSX.Element => <div /> }));
vi.mock("@/components/WizardLayout", () => ({
  WizardLayout: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
}));

import { Step5_Documents } from "../Step5_Documents";

const LOC_PRODUCT = {
  id: "loc-1",
  name: "Business Line of Credit",
  category: "LOC",
  product_type: "LOC",
  country: "CA",
  amount_min: 10_000,
  amount_max: 500_000,
  active: true,
  required_documents: [{ document_type: "Accounts receivable aging report", required: true }],
};

describe("aggregateRequiredDocuments (client fallback)", () => {
  it("returns only the per-product docs (no bank_statements/primary_applicant_id appendage)", () => {
    const products = [{ category: "TERM", required_documents: [
      { document_type: "3 years business tax returns", required: true },
      { document_type: "Balance Sheet - Interim financials", required: true },
    ] }];
    const requirements = aggregateRequiredDocuments(products, "TERM_LOAN", 1_000_000);
    const docTypes = requirements.map((e) => e.document_type).sort();
    expect(docTypes).toEqual([
      "3 years business tax returns",
      "Balance Sheet - Interim financials",
    ].sort());
  });
});

describe("Step 5 prefers the server's required documents", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    h.navigate.mockReset();
    h.update.mockClear();
    h.fetchDocs.mockReset();
    h.products = [LOC_PRODUCT];
    h.set(completeApplication({ documentsDeferred: false }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderAndShowList(): Promise<string> {
    await act(async () => { root.render(<Step5_Documents />); });
    for (let i = 0; i < 5; i += 1) await act(async () => { await Promise.resolve(); });
    const now = container.querySelector<HTMLButtonElement>('[data-testid="step5-choose-now"]');
    if (!now) throw new Error("upload-now option not rendered");
    await act(async () => { now.click(); });
    return container.textContent || "";
  }

  it("shows the server's union and ignores the cached lender products", async () => {
    h.fetchDocs.mockResolvedValue([
      { id: "s1", document_type: "6 months business banking statements", required: true, stage: 1 },
    ]);
    const text = await renderAndShowList();
    expect(text).toMatch(/6 months business banking statements/i);
    expect(text).not.toMatch(/Accounts receivable aging report/i);
  });

  it("falls back to the lender products when the server returns nothing", async () => {
    h.fetchDocs.mockResolvedValue([]);
    const text = await renderAndShowList();
    expect(text).toMatch(/Accounts receivable aging report/i);
    expect(h.fetchDocs).toHaveBeenCalled();
  });

  it("adds no snake_case appendage to the server's list", async () => {
    h.fetchDocs.mockResolvedValue([
      { id: "s1", document_type: "3 years business tax returns", required: true, stage: 1 },
    ]);
    await renderAndShowList();
    const lastAggregated = [...h.update.mock.calls]
      .map(([patch]) => (patch as Partial<ApplicationData>).productRequirements?.aggregated)
      .filter(Boolean)
      .pop() as Array<{ document_type: string }>;
    expect(lastAggregated.map((e) => e.document_type)).toEqual(["3 years business tax returns"]);
  });
});
