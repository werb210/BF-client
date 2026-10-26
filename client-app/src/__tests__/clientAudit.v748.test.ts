// BF_CLIENT_AUDIT_v748
// Step 5's SBA guard used to return early above ~25 hooks, so a path flip while
// the screen was open crashed React ("Rendered fewer hooks"). Render it across
// the flip and check it neither throws nor logs a hooks error.
import { createRequire } from "node:module";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";

const h = vi.hoisted(() => ({
  app: null as unknown as ApplicationData,
  update: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, update: h.update }),
}));
vi.mock("@/api/lenderProducts", () => ({
  fetchRequiredDocsUnion: vi.fn(async () => [{ id: "bank", document_type: "bank_statements", required: true, stage: 1 }]),
}));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: { status: vi.fn(async () => Promise.reject(new Error("offline"))), deferDocuments: vi.fn(async () => ({})) },
}));
vi.mock("@/lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));

import { Step5_Documents } from "@/wizard/Step5_Documents";

const SBA = { productCategory: "SBA", selectedProductType: "SBA" } as const;
const docsApp = () => completeApplication({ currentStep: 5, documentsDeferred: false, documents: {} });
const sbaApp = () => completeApplication({ currentStep: 5, documentsDeferred: false, documents: {}, ...SBA });

let host: HTMLDivElement;
let root: Root;
let consoleError: ReturnType<typeof vi.spyOn>;

async function render(app: ApplicationData): Promise<void> {
  h.app = app;
  await act(async () => {
    root.render(createElement(Step5_Documents));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function hooksErrors(): unknown[] {
  return consoleError.mock.calls.filter((args: unknown[]) => /hooks/i.test(args.map(String).join(" ")));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  h.update.mockReset();
  h.navigate.mockReset();
  consoleError = vi.spyOn(console, "error");
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("client audit fixes", () => {
  it("Step 5 on the SBA path renders nothing and goes to Review", async () => {
    await render(sbaApp());
    expect(host.innerHTML).toBe("");
    expect(h.update).toHaveBeenCalledWith({ currentStep: 6, documentsDeferred: true });
    expect(h.navigate).toHaveBeenCalledWith("/apply/step-6", { replace: true });
  });

  it("the document screen survives the path flipping to SBA and back while it is open", async () => {
    await render(docsApp());
    expect(host.querySelector('[data-testid="step5-options-intro"]')).not.toBeNull();

    await render(sbaApp());
    expect(host.innerHTML).toBe("");

    await render(docsApp());
    expect(host.querySelector('[data-testid="step5-options-intro"]')).not.toBeNull();
    expect(hooksErrors()).toEqual([]);
  });

  it("lint reads TypeScript and checks the rules of hooks", () => {
    // .eslintrc.cjs sits outside src; load it as config rather than text.
    const config = createRequire(import.meta.url)(join(process.cwd(), ".eslintrc.cjs")) as {
      parser?: string;
      rules?: Record<string, unknown>;
    };
    expect(config.parser).toBe("@typescript-eslint/parser");
    expect(config.rules?.["react-hooks/rules-of-hooks"]).toBe("error");
  });
});
