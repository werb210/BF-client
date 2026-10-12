/* @vitest-environment jsdom */
// BF_CLIENT_BLOCK_v861_EQUIP_PARENT_LEG_ONLY - the parent equipment
// application's Step 5 asks the server for its OWN equipment leg only. It used
// to add a phantom closing-cost companion leg (TERM / LOC by amount) whose
// lender-product forms (Flinks / CRA / Professional advisors) leaked onto the
// equipment application's required documents.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import type { DocRequirementsQuery } from "@/api/lenderProducts";
import { completeApplication } from "@/test/fixtures/completeApplication";

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
vi.mock("@/lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));
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

const DOCS_BY_CATEGORY: Record<string, Array<{ id: string; document_type: string; required: boolean; stage: number }>> = {
  EQUIPMENT: [{ id: "eq-quote", document_type: "Equipment quote or invoice", required: true, stage: 1 }],
  TERM: [{ id: "flinks", document_type: "Flinks banking connection", required: true, stage: 1 }],
  LOC: [{ id: "cra", document_type: "CRA authorization", required: true, stage: 1 }],
  "Working Capital": [{ id: "bank", document_type: "6 months business banking statements", required: true, stage: 1 }],
};

function equipmentApp(kyc: Record<string, string>, productCategory: string): ApplicationData {
  const base = completeApplication({ productCategory, selectedProductType: productCategory, documentsDeferred: false });
  return { ...base, kyc: { ...base.kyc, ...kyc } };
}

describe("Step 5 equipment parent aggregates its own leg only", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    h.navigate.mockReset();
    h.update.mockClear();
    h.fetchDocs.mockReset();
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    h.fetchDocs.mockImplementation(async (q: DocRequirementsQuery) => DOCS_BY_CATEGORY[String(q.product_category)] ?? []);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderStep5(): Promise<void> {
    await act(async () => { root.render(<Step5_Documents />); });
    for (let i = 0; i < 5; i += 1) await act(async () => { await Promise.resolve(); });
  }

  async function chooseUploadNow(): Promise<void> {
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="step5-choose-now"]');
    if (!btn) throw new Error("upload-now option not rendered");
    await act(async () => { btn.click(); });
  }

  const categoriesRequested = (): string[] =>
    h.fetchDocs.mock.calls.map(([q]) => String((q as DocRequirementsQuery).product_category));

  it("equipment-only asks the server for the EQUIPMENT leg and nothing else", async () => {
    h.set(equipmentApp({ lookingFor: "EQUIPMENT", fundingAmount: "", equipmentAmount: "$80,000" }, "EQUIPMENT"));
    await renderStep5();

    const categories = categoriesRequested();
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories)).toEqual(new Set(["EQUIPMENT"]));
    const legCall = h.fetchDocs.mock.calls.find(([q]) => (q as DocRequirementsQuery).funding_amount === 80000);
    expect(legCall).toBeTruthy();
  });

  it("no closing-cost companion form reaches the equipment application's document list", async () => {
    h.set(equipmentApp({ lookingFor: "EQUIPMENT", fundingAmount: "", equipmentAmount: "$80,000" }, "EQUIPMENT"));
    await renderStep5();
    await chooseUploadNow();

    const text = container.textContent || "";
    expect(text).toMatch(/Equipment quote or invoice/i);
    expect(text).not.toMatch(/Flinks/i);
    expect(text).not.toMatch(/CRA authorization/i);
  });

  it("capital and equipment still asks for both legs", async () => {
    h.set(equipmentApp({ lookingFor: "BOTH", fundingAmount: "$50,000", equipmentAmount: "$80,000" }, "Working Capital"));
    await renderStep5();

    const categories = new Set(categoriesRequested());
    expect(categories.has("EQUIPMENT")).toBe(true);
    expect(categories.has("Working Capital")).toBe(true);
    expect(categories.has("TERM")).toBe(false);
    expect(categories.has("LOC")).toBe(false);
  });
});
