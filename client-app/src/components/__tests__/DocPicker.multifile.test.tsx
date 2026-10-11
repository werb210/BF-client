// BF_CLIENT_DOCPICKER_MULTIFILE_v1 - the CMP "Upload Documents" picker stays
// multi-file: the input accepts several files and every selected file is
// uploaded, not just files[0].
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ apiCall }));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://api.test" } }));
vi.mock("@/lib/uploadQueue", () => ({ enqueueUploadFromFile: vi.fn(), isRetryableUploadFailure: () => false }));
vi.mock("@/lib/docUpload", () => ({ queuedMessage: (n: number) => `${n} queued`, reportUploadFailure: vi.fn() }));

import DocPicker from "../DocPicker";

const fetchMock = vi.fn();
let picked: HTMLInputElement | null = null;

beforeEach(() => {
  apiCall.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  picked = null;
  // Capture the file input the picker creates instead of opening a real dialog.
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) { picked = this; });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function choose(files: File[]) {
  if (!picked) throw new Error("no file input was opened");
  Object.defineProperty(picked, "files", { value: files, configurable: true });
  picked.onchange?.(new Event("change"));
}

describe("DocPicker multi-file picker", () => {
  it("opens a file input that accepts several files", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] });
    render(<DocPicker applicationId="app-1" onClose={() => {}} />);
    (await screen.findByText("Upload")).click();
    expect(picked?.type).toBe("file");
    expect(picked?.multiple).toBe(true);
  });

  it("uploads every selected file, not just the first, then clears the item", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] });
    const onUploaded = vi.fn();
    render(<DocPicker applicationId="app-1" onClose={() => {}} onUploaded={onUploaded} />);
    (await screen.findByText("Upload")).click();
    const files = ["jan.pdf", "feb.pdf", "mar.pdf"].map((n) => new File(["x"], n, { type: "application/pdf" }));
    await act(async () => { choose(files); });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sent = fetchMock.mock.calls.map((c) => (c[1].body as FormData).get("file") as File);
    expect(sent.map((f) => f.name)).toEqual(["jan.pdf", "feb.pdf", "mar.pdf"]);
    for (const c of fetchMock.mock.calls) {
      expect(c[0]).toBe("http://api.test/api/client/documents/upload");
      expect((c[1].body as FormData).get("category")).toBe("bank_statements");
    }
    expect(screen.queryByText("Bank statements")).toBeNull();
  });

  it("keeps the item when one of the files fails, so the client can retry", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 }).mockResolvedValueOnce({ ok: false, status: 500 });
    const onUploaded = vi.fn();
    render(<DocPicker applicationId="app-1" onClose={() => {}} onUploaded={onUploaded} />);
    (await screen.findByText("Upload")).click();
    await act(async () => { choose([new File(["a"], "a.pdf"), new File(["b"], "b.pdf")]); });
    expect(await screen.findByText(/Upload failed/)).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.getByText("Bank statements")).toBeTruthy();
  });
});
