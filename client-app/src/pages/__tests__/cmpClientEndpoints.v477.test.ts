// BF_CLIENT_BLOCK_v477_CMP_CLIENT_ENDPOINTS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = readFileSync(resolve(__dirname, "../MiniPortalPage.tsx"), "utf8");

describe("v477 client portal uses client endpoints only", () => {
  it("no longer calls the staff-only application detail or offers list", () => {
    expect(file).not.toContain("await apiCall<any>(`/api/applications/${encodeURIComponent(applicationId)}`)");
    expect(file).not.toContain("`/api/offers?applicationId=");
    expect(file).not.toContain("`/api/applications/${encodeURIComponent(applicationId)}/documents`");
  });
  it("reads offers and rejected documents from the client routes", () => {
    expect(file).toContain("`/api/client/offers?applicationId=${encodeURIComponent(applicationId)}`");
    expect(file).toContain("`/api/client/rejected-documents?applicationId=${encodeURIComponent(applicationId)}`");
  });
  it("still reads stage and prefill from the client stage endpoint", () => {
    expect(file).toContain("/api/client/application-stage?applicationId=");
  });
});
