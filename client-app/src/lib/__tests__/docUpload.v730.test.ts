// BF_CLIENT_DIRECT_UPLOAD_v730
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/lib/uploadQueue", () => ({
  enqueueUploadFromFile: vi.fn(async () => 1),
  isRetryableUploadFailure: (status: number | undefined) => status === undefined || status >= 500 || status === 429,
}));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));
import { uploadDocumentFiles, queuedMessage, failureMessage } from "../docUpload";

const file = () => new File(["x"], "a.pdf", { type: "application/pdf" });
let calls: Array<{ url: string; body: unknown }> = [];

describe("direct upload", () => {
  beforeEach(() => { calls = []; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("uploads and reports ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => { calls.push({ url, body: init?.body }); return new Response("{}", { status: 201 }); }));
    expect(await uploadDocumentFiles("app-1", "owner_photo_id", [file()])).toEqual({ status: "ok" });
    expect(calls.map((c) => c.url)).toEqual(["https://api.test/api/client/documents/upload"]);
  });

  it("a network error is saved for retry, reported to the server, and not called offline while online", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: init?.body });
      if (url.endsWith("/documents/upload")) throw new TypeError("Failed to fetch");
      return new Response(null, { status: 204 });
    }));
    const r = await uploadDocumentFiles("app-1", "owner_photo_id", [file()]);
    expect(r.status).toBe("queued");
    expect((r as any).message).toMatch(/^That upload didn't go through/);
    const beacon = calls.find((c) => c.url.endsWith("/api/client/upload-failure"));
    expect(beacon).toBeTruthy();
    expect(JSON.parse(String(beacon!.body))).toMatchObject({ documentType: "owner_photo_id", errorName: "TypeError", errorMessage: "Failed to fetch", online: true });
  });

  it("a refused file says why and is not queued", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.endsWith("/documents/upload") ? new Response("{}", { status: 409 }) : new Response(null, { status: 204 }))));
    expect(await uploadDocumentFiles("app-1", "owner_photo_id", [file()])).toEqual({ status: "failed", message: "That file has already been uploaded." });
  });

  it("messages", () => {
    expect(queuedMessage(1, false)).toMatch(/^No connection right now\. 1 file is saved/);
    expect(queuedMessage(3, true)).toMatch(/^That upload didn't go through\. 3 files are saved/);
    expect(failureMessage(413)).toMatch(/too large/);
  });
});

describe("wiring", () => {
  it("the to-do list Upload opens the file picker directly on the web; the phone apps keep the scanner pop-up", () => {
    const m = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
    expect(m).toContain("if (!Capacitor.isNativePlatform()) { const label = item.label; pickFiles(");
    expect(m).toContain('data-testid="upload-notice"');
  });
  it("the pop-up opened for one item closes after the upload instead of saying all caught up", () => {
    const d = readFileSync("src/components/DocPicker.tsx", "utf8");
    expect(d).toContain("if (aimedAt) { setUploading(null); onClose(); return; }");
    expect(d).toContain("setNotice(queuedMessage(queued));");
  });
});
