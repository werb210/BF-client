// BF_CLIENT_v841_OTHER_DOC - the mini-portal Upload Documents popup always offers an
// "Other document (optional)" row, filed as "other", that never clears the needed list.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/appUsage", () => ({ trackUsage: (): void => undefined, trackOpen: (): boolean => false }));
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
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) { picked = this; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function choose(files: File[]) {
  if (!picked) throw new Error("no file input was opened");
  Object.defineProperty(picked, "files", { value: files, configurable: true });
  picked.onchange?.(new Event("change"));
}

describe("DocPicker Other document row", () => {
  it("shows the row alongside the needed list and files uploads as other", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [{ document_type: "bank_statements", label: "Bank statements" }], rejected: [] });
    const onUploaded = vi.fn();
    render(<DocPicker applicationId="app-1" onClose={() => {}} onUploaded={onUploaded} />);
    expect(await screen.findByText("Other document (optional)")).toBeTruthy();
    (await screen.findByTestId("docpicker-other-upload")).click();
    expect(picked?.multiple).toBe(true);
    await act(async () => { choose([new File(["a"], "lease.pdf"), new File(["b"], "contract.pdf")]); });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const c of fetchMock.mock.calls) expect((c[1].body as FormData).get("category")).toBe("other");
    expect(await screen.findByText(/2 documents were added/)).toBeTruthy();
    // The requested item is untouched and the row stays for more.
    expect(screen.getByText("Bank statements")).toBeTruthy();
    expect(screen.getByTestId("docpicker-other-upload")).toBeTruthy();
  });

  it("is offered even when nothing else is needed", async () => {
    apiCall.mockResolvedValue({ stillNeeded: [], rejected: [] });
    render(<DocPicker applicationId="app-1" onClose={() => {}} />);
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
    expect(screen.getByTestId("docpicker-other")).toBeTruthy();
  });

  it("is hidden when the popup is opened for one specific document", async () => {
    render(<DocPicker applicationId="app-1" onClose={() => {}} documentType="void_cheque" documentLabel="VOID cheque" />);
    expect(await screen.findByText("VOID cheque")).toBeTruthy();
    expect(screen.queryByTestId("docpicker-other")).toBeNull();
  });
});
