import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), "src", ...parts), "utf-8");
const step5 = read("wizard", "Step5_Documents.tsx");
const modal = read("components", "AccountantReferralModal.tsx");
const clientApp = read("api", "clientApp.ts");

describe("BF_CLIENT_STEP5_ACCOUNTANT_v1", () => {
  it("offers the accountant route alongside the existing deferral", () => {
    expect(step5).toContain("Have my accountant upload the documents");
    expect(step5).toContain("I will supply all required documents at a later time");
  });

  it("advances on the same path as the plain deferral", () => {
    expect(step5).toContain("await uploadLater();");
  });

  it("gates the advance behind the modal", () => {
    expect(step5).toContain("AccountantReferralModal");
    expect(step5).toContain("setAccountantOpen(true)");
  });

  it("requires every field before it will submit", () => {
    expect(modal).toContain("Please fill in all four fields");
    expect(modal).toContain("Please enter a valid email address.");
  });

  it("posts to the capture endpoint keyed by application id", () => {
    expect(clientApp).toContain("referAccountant");
    expect(clientApp).toContain("/api/client/accountant");
  });

  // BF_CLIENT_ACCOUNTANT_SURFACE_FAILURE_v1
  it("stops and tells the applicant when the capture call fails", () => {
    expect(step5).not.toContain("referAccountant failed; continuing anyway");
    expect(step5).toContain("setAccountantError(");
    expect(step5).toContain("We couldn't send this to your accountant.");
    expect(modal).toContain("submitError");
  });

  it("sends the business name the server cannot know yet at Step 5", () => {
    expect(step5).toContain("businessName: app.business?.businessName");
    expect(clientApp).toContain("businessName?: string");
  });
});
