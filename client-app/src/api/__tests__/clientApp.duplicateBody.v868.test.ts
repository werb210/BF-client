// BF_CLIENT_v868_DUPLICATE_UX - the application wizard's upload error carries the server's 409 body, so Step 5 can
// tell "already uploaded under this item" (done) from "already uploaded somewhere else".
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));
vi.mock("@/auth/token", () => ({ getToken: () => "jwt-1" }));

import { ClientAppAPI } from "../clientApp";
import { isServerDuplicate } from "@/lib/documentFingerprint";
import { duplicateFromBody } from "@/lib/duplicateUpload";

afterEach(() => { vi.unstubAllGlobals(); });

describe("wizard upload answered 409 duplicate", () => {
  it("rejects with the status, the code and the body naming the existing document", async () => {
    const body = { ok: false, error: "DUPLICATE_DOCUMENT", message: "already", existing: { id: "d1", category: "bank_statements", filename: "jan.pdf", status: "uploaded" } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const err = await ClientAppAPI.uploadDocument({
      applicationId: "app-1", applicationToken: "tok", documentType: "bank_statements",
      file: new File(["%PDF"], "jan.pdf", { type: "application/pdf" }),
    }).catch((e) => e);
    expect(isServerDuplicate(err)).toBe(true);
    expect(err.body).toEqual(body);
    expect(duplicateFromBody(err.body, "bank_statements")?.sameItem).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // a 4xx is not retried
  });
});
