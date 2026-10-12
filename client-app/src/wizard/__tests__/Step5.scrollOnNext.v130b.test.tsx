/* @vitest-environment jsdom */
// BF_CLIENT_BLOCK_v130b_STEP5_SCROLL_AND_OTP_PHONE_CLAIM_v1 - (A) Step 5 scroll.
// A broad effect used to call scrollToFirstError() whenever the missing-docs
// count changed, so every successful upload threw the page back to the top
// mid-flow. Uploading must leave the scroll position alone.
// Part (B), the OTP phone claim, lives in Step5.scrollOnNext.v130b.phoneClaim.test.tsx.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
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
    scroll: vi.fn(),
    upload: vi.fn(),
  };
});

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/state/useApplicationStore", async () => {
  const React = await import("react");
  return {
    useApplicationStore: () => ({ app: React.useSyncExternalStore(h.subscribe, h.get), update: h.update }),
  };
});
vi.mock("@/styles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/styles")>()),
  scrollToFirstError: h.scroll,
}));
vi.mock("@/api/lenderProducts", () => ({
  fetchRequiredDocsUnion: vi.fn(async () => [
    { id: "bank", document_type: "6 months business banking statements", required: true, stage: 1 },
    { id: "tax", document_type: "3 years business tax returns", required: true, stage: 1 },
  ]),
}));
vi.mock("@/lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: {
    status: vi.fn(async () => ({ data: {} })),
    uploadDocument: h.upload,
    deferDocuments: vi.fn(async () => ({})),
  },
}));
vi.mock("@/wizard/saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("@/utils/track", () => ({ track: vi.fn() }));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/StepHeader", () => ({ StepHeader: (): JSX.Element => <div /> }));
vi.mock("@/components/WizardLayout", () => ({
  WizardLayout: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
}));

import { Step5_Documents } from "../Step5_Documents";

describe("Step 5 does not scroll the page on upload", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    h.navigate.mockReset();
    h.update.mockClear();
    h.scroll.mockReset();
    h.upload.mockReset();
    h.upload.mockResolvedValue({ data: { id: "doc-1" } });
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

  async function flush(): Promise<void> {
    // Uploads hash the file (crypto.subtle) before posting, which settles on a
    // later macrotask than a bare microtask flush reaches.
    for (let i = 0; i < 6; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }

  async function renderUploadList(): Promise<void> {
    await act(async () => { root.render(<Step5_Documents />); });
    await flush();
    const now = container.querySelector<HTMLButtonElement>('[data-testid="step5-choose-now"]');
    if (!now) throw new Error("upload-now option not rendered");
    await act(async () => { now.click(); });
  }

  async function upload(entryId: string, name: string): Promise<void> {
    const input = container.querySelector<HTMLInputElement>(`#doc-${entryId}`);
    if (!input) throw new Error(`no file input for ${entryId}`);
    const file = new File(["%PDF-1.4 " + name], name, { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    await flush();
  }

  const continueButton = (): HTMLButtonElement | undefined =>
    Array.from(container.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Continue");

  it("an upload that shrinks the missing list leaves the scroll position alone", async () => {
    await renderUploadList();
    expect(container.textContent).toMatch(/Missing required documents/);

    await upload("bank", "bank.pdf");

    expect(h.upload).toHaveBeenCalledTimes(1);
    expect(h.get().documents["6 months business banking statements"]).toBeTruthy();
    expect(h.scroll).not.toHaveBeenCalled();
  });

  it("Continue stays disabled until every required document is in, then advances without scrolling", async () => {
    await renderUploadList();
    expect(continueButton()?.disabled).toBe(true);

    await upload("bank", "bank.pdf");
    expect(continueButton()?.disabled).toBe(true);

    await upload("tax", "tax.pdf");
    const btn = continueButton();
    expect(btn?.disabled).toBe(false);
    await act(async () => { btn?.click(); });
    await flush();

    expect(h.navigate).toHaveBeenCalledWith("/apply/step-6");
    expect(h.scroll).not.toHaveBeenCalled();
  });
});
