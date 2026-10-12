// BF_CLIENT_STEP5_OPTIONS_v174 - the two actions above the upload section are
// alternatives to uploading. Nothing on the page said so.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";

const h = vi.hoisted(() => ({
  app: null as unknown as ApplicationData,
  update: vi.fn(),
  navigate: vi.fn(),
  requiredDocs: [] as Array<Record<string, unknown>>,
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, update: h.update }),
}));
vi.mock("@/api/lenderProducts", () => ({ fetchRequiredDocsUnion: vi.fn(async () => h.requiredDocs) }));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: {
    status: vi.fn(async () => Promise.reject(new Error("offline"))),
    deferDocuments: vi.fn(async () => ({})),
    referAccountant: vi.fn(async () => ({})),
  },
}));
vi.mock("@/lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));

import { Step5_Documents } from "@/wizard/Step5_Documents";

const BANK = { id: "bank", document_type: "bank_statements", required: true, stage: 1 };
const NAVY_BORDER = "2px solid rgb(11, 31, 58)"; // tokens.colors.primary #0B1F3A

let host: HTMLDivElement;
let root: Root;

async function render(app: ApplicationData): Promise<void> {
  h.app = app;
  await act(async () => {
    root.render(createElement(Step5_Documents));
  });
  // let the requirement fetch settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function byTestId(id: string): HTMLElement | null {
  return host.querySelector(`[data-testid="${id}"]`);
}

const missingDocsApp = () => completeApplication({ currentStep: 5, documentsDeferred: false, documents: {} });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  h.update.mockReset();
  h.navigate.mockReset();
  h.requiredDocs = [BANK];
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

describe("step 5 presents three options", () => {
  it("explains the choice when documents are missing", async () => {
    await render(missingDocsApp());
    const intro = byTestId("step5-options-intro");
    expect(intro?.textContent).toContain("You have three options.");
    expect(intro?.textContent).toContain("supply them");
  });

  it("only shows the explainer when something is actually missing", async () => {
    const uploaded = { bank_statements: { name: "bank.pdf", status: "uploaded" } } as unknown as ApplicationData["documents"];
    await render(completeApplication({ currentStep: 5, documentsDeferred: false, documents: uploaded }));
    const cont = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Continue");
    expect(cont?.disabled).toBe(false); // requirements loaded, nothing missing
    expect(byTestId("step5-options-intro")).toBeNull();
    expect(byTestId("step5-options-row")).toBeNull();
  });

  it("separates the options with Or", async () => {
    await render(missingDocsApp());
    const row = byTestId("step5-options-row");
    const ors = Array.from(row?.children ?? []).filter((el) => el.tagName !== "BUTTON" && el.textContent === "Or");
    expect(ors).toHaveLength(2);
    expect(row?.querySelectorAll("button")).toHaveLength(3);
  });

  it("keeps both actions", async () => {
    await render(missingDocsApp());
    expect(byTestId("step5-choose-later")?.textContent).toBe("I will supply all required documents at a later time");
    expect(byTestId("step5-accountant-btn")?.textContent).toBe("Have my accountant upload the documents");
  });

  it("supplying later defers the documents and moves to Step 6", async () => {
    await render(missingDocsApp());
    await act(async () => {
      byTestId("step5-choose-later")?.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.update).toHaveBeenCalledWith({ documentsDeferred: true });
    expect(h.navigate).toHaveBeenCalledWith("/apply/step-6");
  });
});

describe("the options read as buttons", () => {
  it("uses a navy border, not the hairline that read as a panel", async () => {
    await render(missingDocsApp());
    for (const id of ["step5-choose-now", "step5-choose-later", "step5-accountant-btn"]) {
      expect((byTestId(id) as HTMLButtonElement).style.border).toBe(NAVY_BORDER);
    }
  });
});
