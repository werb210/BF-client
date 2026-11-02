// BF_CLIENT_v868_DUPLICATE_UX - a 409 "already uploaded" is a friendly note, not a failure.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/uploadQueue", () => ({
  enqueueUploadFromFile: vi.fn(async () => 1),
  isRetryableUploadFailure: (status: number | undefined) => status === undefined || status >= 500 || status === 429,
}));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));
vi.mock("@/lib/appUsage", () => ({ trackUsage: (): void => undefined }));
import { uploadDocumentFiles } from "../docUpload";
import { duplicateFromBody, duplicateSummary, readDuplicate } from "../duplicateUpload";

const dupBody = (category: string | null, status = "uploaded") => ({
  ok: false, error: "DUPLICATE_DOCUMENT", message: "This file is already uploaded on this application.",
  existing: { id: "4496b975", category, filename: "Business Plan.docx", status },
});
const docx = (name = "plan.docx") => new File(["x"], name, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

afterEach(() => { vi.unstubAllGlobals(); });

describe("duplicateFromBody", () => {
  it("the same item: nothing more needed", () => {
    expect(duplicateFromBody(dupBody("business_plan"), "business_plan")).toMatchObject({ sameItem: true, message: "This file is already uploaded. Nothing more is needed for it." });
    expect(duplicateFromBody(dupBody("Business Plan"), "business_plan")?.sameItem).toBe(true);
    expect(duplicateFromBody(dupBody("bank_statements"), "other")?.sameItem).toBe(true);
  });
  it("a different item: says where it is and does not count it", () => {
    const d = duplicateFromBody(dupBody("bank_statements"), "business_plan");
    expect(d?.sameItem).toBe(false);
    expect(d?.message).toBe("This file is already uploaded (under Bank statements). If this item needs a different document, please choose that file.");
  });
  it("a file that was already rejected asks for a new copy", () => {
    const d = duplicateFromBody(dupBody("business_plan", "rejected"), "business_plan");
    expect(d?.sameItem).toBe(false);
    expect(d?.message).toMatch(/could not be accepted/);
  });
  it("any other body is not a duplicate", () => {
    expect(duplicateFromBody({ ok: false, error: "APPLICATION_NOT_ACCEPTING_UPLOADS" }, "x")).toBeNull();
    expect(duplicateFromBody(null, "x")).toBeNull();
  });
  it("readDuplicate only answers for a 409 with the duplicate body, and never throws", async () => {
    expect(await readDuplicate(new Response(JSON.stringify(dupBody("a"))), "a")).toBeNull(); // 200
    expect(await readDuplicate(new Response("not json", { status: 409 }), "a")).toBeNull();
    expect((await readDuplicate(new Response(JSON.stringify(dupBody("a")), { status: 409 }), "a"))?.sameItem).toBe(true);
  });
  it("summarises a batch", () => {
    const same = duplicateFromBody(dupBody("a"), "a")!;
    expect(duplicateSummary([same], 2)).toBe("2 files were uploaded. 1 was already on your application, so it was skipped.");
    expect(duplicateSummary([same, same], 0)).toBe("These files are already uploaded. Nothing more is needed for them.");
  });
});

describe("direct upload with a duplicate", () => {
  const stub = (answer: (n: number) => Response) => {
    const calls: string[] = [];
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      return url.endsWith("/documents/upload") ? answer(n++) : new Response(null, { status: 204 });
    }));
    return calls;
  };

  it("is not reported as an upload failure and counts the item as done", async () => {
    const calls = stub(() => new Response(JSON.stringify(dupBody("business_plan")), { status: 409 }));
    const r = await uploadDocumentFiles("app-1", "business_plan", [docx()]);
    expect(r).toEqual({ status: "duplicate", satisfied: true, message: "This file is already uploaded. Nothing more is needed for it." });
    expect(calls.some((u) => u.endsWith("/api/client/upload-failure"))).toBe(false);
  });

  it("keeps going with the other files in the batch", async () => {
    const calls = stub((n) => (n === 0 ? new Response(JSON.stringify(dupBody("bank_statements")), { status: 409 }) : new Response("{}", { status: 201 })));
    const r = await uploadDocumentFiles("app-1", "bank_statements", [docx("jan.pdf"), docx("feb.pdf")]);
    expect(r).toEqual({ status: "duplicate", satisfied: true, message: "1 file was uploaded. 1 was already on your application, so it was skipped." });
    expect(calls.filter((u) => u.endsWith("/documents/upload"))).toHaveLength(2);
  });

  it("a file already under another item leaves this item open, without an error", async () => {
    stub(() => new Response(JSON.stringify(dupBody("bank_statements")), { status: 409 }));
    const r = await uploadDocumentFiles("app-1", "business_plan", [docx()]);
    expect(r).toMatchObject({ status: "duplicate", satisfied: false });
  });

  it("a 409 that is not a duplicate is still a failure and still reported", async () => {
    const calls = stub(() => new Response(JSON.stringify({ ok: false, error: "APPLICATION_NOT_ACCEPTING_UPLOADS" }), { status: 409 }));
    const r = await uploadDocumentFiles("app-1", "business_plan", [docx()]);
    expect(r.status).toBe("failed");
    expect(calls.some((u) => u.endsWith("/api/client/upload-failure"))).toBe(true);
  });
});
