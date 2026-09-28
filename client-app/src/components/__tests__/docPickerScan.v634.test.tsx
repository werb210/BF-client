// BF_CLIENT_DOCPICKER_SCAN_v634
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ native: true, scanned: 0, uploads: [] as string[] }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@/api/client", () => ({ apiCall: vi.fn(async () => ({ stillNeeded: [{ document_type: "void_cheque", label: "VOID cheque or PAD" }], rejected: [] })) }));
vi.mock("@/native/documentScanner", () => ({
  scanDocumentAsPdfWithQuality: vi.fn(async () => { h.scanned += 1; return { file: new File(["%PDF"], "void-cheque-scan.pdf", { type: "application/pdf" }), quality: { ok: false, message: "Page 1 looks blurry." } }; }),
}));
vi.mock("@/lib/uploadQueue", () => ({ enqueueUploadFromFile: vi.fn(), isRetryableUploadFailure: () => false }));
vi.mock("@/auth/token", () => ({ getToken: () => "t" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "" } }));

import DocPicker from "../DocPicker";

beforeEach(() => {
  h.native = true; h.scanned = 0; h.uploads = [];
  (globalThis as any).fetch = vi.fn(async (_url: string, init: any) => { h.uploads.push(String(init.body.get("document_type"))); return new Response("{}", { status: 200 }); });
});

describe("v634 scan in the upload window", () => {
  it("offers Scan on the phone, uploads the scanned PDF against the item, and keeps the quality warning", async () => {
    const uploaded = vi.fn();
    render(<DocPicker applicationId="a1" onClose={() => undefined} onUploaded={uploaded} />);
    fireEvent.click(await screen.findByTestId("docpicker-scan"));
    await waitFor(() => expect(uploaded).toHaveBeenCalled());
    expect(h.scanned).toBe(1);
    expect(h.uploads).toEqual(["void_cheque"]);
    expect(await screen.findByText("Page 1 looks blurry.")).toBeTruthy();
  });

  it("does not offer Scan in a desktop browser", async () => {
    h.native = false;
    render(<DocPicker applicationId="a1" onClose={() => undefined} />);
    await screen.findByText("VOID cheque or PAD");
    expect(screen.queryByTestId("docpicker-scan")).toBeNull();
  });
});
