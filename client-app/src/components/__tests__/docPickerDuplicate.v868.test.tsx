// BF_CLIENT_v868_DUPLICATE_UX - the portal's Upload Documents pop-up treats "already uploaded" as a note, not a failure.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/appUsage", () => ({ trackUsage: (): void => undefined, trackOpen: (): boolean => false }));
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const apiCall = vi.hoisted(() => vi.fn());
const reportUploadFailure = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ apiCall }));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://api.test" } }));
vi.mock("@/lib/uploadQueue", () => ({ enqueueUploadFromFile: vi.fn(), isRetryableUploadFailure: () => false }));
vi.mock("@/lib/docUpload", () => ({ queuedMessage: (n: number) => `${n} queued`, reportUploadFailure }));

import DocPicker from "../DocPicker";

const fetchMock = vi.fn();
let picked: HTMLInputElement | null = null;
const dup = (category: string) => new Response(JSON.stringify({ ok: false, error: "DUPLICATE_DOCUMENT", existing: { id: "d1", category, filename: "x.pdf", status: "uploaded" } }), { status: 409 });

beforeEach(() => {
  apiCall.mockReset(); fetchMock.mockReset(); reportUploadFailure.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  picked = null;
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) { picked = this; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function choose(files: File[]) {
  if (!picked) throw new Error("no file input was opened");
  Object.defineProperty(picked, "files", { value: files, configurable: true });
  picked.onchange?.(new Event("change"));
}

describe("DocPicker duplicate upload", () => {
  it("the file is already under this item: a friendly note, the item is done, nothing reported", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }, { document_type: "void_cheque", label: "VOID cheque" }], rejected: [] });
    fetchMock.mockResolvedValue(dup("bank_statements"));
    const onUploaded = vi.fn();
    render(<DocPicker applicationId="app-1" onClose={() => {}} onUploaded={onUploaded} />);
    (await screen.findAllByText("Upload"))[0].click();
    await act(async () => { choose([new File(["a"], "jan.pdf")]); });
    expect(await screen.findByText("This file is already uploaded. Nothing more is needed for it.")).toBeTruthy();
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Bank statements")).toBeNull();
    expect(screen.getByText("VOID cheque")).toBeTruthy();
    expect(reportUploadFailure).not.toHaveBeenCalled();
    expect(screen.queryByText(/Upload failed/)).toBeNull();
  });

  it("the file is under another item: the note says where, and this item stays", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "void_cheque", label: "VOID cheque" }], rejected: [] });
    fetchMock.mockResolvedValue(dup("bank_statements"));
    const onUploaded = vi.fn();
    render(<DocPicker applicationId="app-1" onClose={() => {}} onUploaded={onUploaded} />);
    (await screen.findByText("Upload")).click();
    await act(async () => { choose([new File(["a"], "cheque.pdf")]); });
    expect(await screen.findByText(/already uploaded \(under Bank statements\)/)).toBeTruthy();
    expect(screen.getByText("VOID cheque")).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(reportUploadFailure).not.toHaveBeenCalled();
  });
});
