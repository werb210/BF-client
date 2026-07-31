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

  it("does not block the applicant when the capture call fails", () => {
    expect(step5).toContain("referAccountant failed; continuing anyway");
  });
});
