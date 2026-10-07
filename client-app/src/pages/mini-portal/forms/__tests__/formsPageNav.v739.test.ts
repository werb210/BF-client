// BF_CLIENT_FORMS_PAGE_NAV_v739
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/mini-portal/forms/Stage2Page.tsx", "utf8");

describe("the forms list page", () => {
  it("has a way back to the client portal", () => {
    expect(page).toContain('data-testid="forms-back-to-portal" onClick={() => navigate("/portal")}');
    expect(page).toContain("Back to my application");
  });
  it("writes SBA as an acronym", () => {
    const label = (docType: string) => docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bSba\b/g, "SBA");
    expect(page).toContain('.replace(/\\bSba\\b/g, "SBA")');
    expect(label("sba_form_1919")).toBe("SBA Form 1919");
    expect(label("sba_form_413_owner_2")).toBe("SBA Form 413 Owner 2");
  });
});
