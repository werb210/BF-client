// BF_CLIENT_UPLOAD_BOUNDARY_v62 - a FormData upload must never carry a
// hand-written Content-Type. "multipart/form-data" without ";boundary=..."
// makes multer throw "Multipart: Boundary not found" (500), and the retry
// queue then re-fails forever. The browser only adds the boundary when the
// caller leaves Content-Type unset, so assert on the request actually sent.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));
vi.mock("@/auth/token", () => ({ getToken: () => "jwt-1" }));

import { ClientAppAPI } from "../clientApp";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

function headerNames(init: RequestInit): string[] {
  return Object.keys((init.headers ?? {}) as Record<string, string>).map((h) => h.toLowerCase());
}

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ status: "ok", data: { id: "doc-1" } }), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BF_CLIENT_UPLOAD_BOUNDARY_v62 - multipart Content-Type guard", () => {
  it("posts the FormData body to the public upload route with no Content-Type header", async () => {
    const file = new File(["%PDF-1.4"], "june.pdf", { type: "application/pdf" });
    const res = await ClientAppAPI.uploadDocument({
      applicationId: "app-1",
      applicationToken: "tok-1",
      documentType: "bank_statements",
      file,
    });

    expect(res.data).toEqual({ id: "doc-1" });
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe("https://api.test/api/documents/public-upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    // The fix: nothing may set Content-Type, so the browser writes the boundary.
    expect(headerNames(init)).not.toContain("content-type");
    expect(headerNames(init)).toContain("authorization");
  });

  it("sends the file, category, application id and application token as form fields", async () => {
    const file = new File(["%PDF-1.4"], "june.pdf", { type: "application/pdf" });
    await ClientAppAPI.uploadDocument({
      applicationId: "app-1",
      applicationToken: "tok-1",
      documentType: "bank_statements",
      file,
    });
    const body = calls[0].init.body as FormData;
    expect((body.get("file") as File).name).toBe("june.pdf");
    expect(body.get("category")).toBe("bank_statements");
    expect(body.get("applicationId")).toBe("app-1");
    expect(body.get("application_token")).toBe("tok-1");
  });

  it("JSON requests still declare application/json (only FormData skips it)", async () => {
    await ClientAppAPI.sendMessage("app-1", "hello");
    expect(calls[0].init.body).toBe(JSON.stringify({ text: "hello" }));
    expect((calls[0].init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("refuses an unsupported file before any request is made", async () => {
    vi.useFakeTimers();
    try {
      const file = new File(["MZ"], "setup.exe", { type: "application/x-msdownload" });
      const result = ClientAppAPI.uploadDocument({ applicationId: "app-1", documentType: "bank_statements", file });
      const settled = expect(result).rejects.toThrow("Unsupported file type");
      await vi.runAllTimersAsync();
      await settled;
      expect(calls).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
