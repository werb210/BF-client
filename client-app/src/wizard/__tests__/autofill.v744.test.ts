// BF_CLIENT_AUTOFILL_v744
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fillEmpty } from "../Step1_KYC";

describe("returning clients and browsers can fill the application", () => {
  it("prior answers fill only empty fields", () => {
    expect(fillEmpty({ city: "Calgary", street: "" }, { city: "Edmonton", street: "450 Sparling Crt SW", zip: "T6X 1G9", dob: null }))
      .toEqual({ city: "Calgary", street: "450 Sparling Crt SW", zip: "T6X 1G9" });
    expect(fillEmpty(undefined, "nope")).toEqual({});
  });
  it("Step 1 applies the last application's business and owner details", () => {
    const s = readFileSync("src/wizard/Step1_KYC.tsx", "utf8");
    expect(s).toContain("...fillEmpty(app.business as Record<string, unknown>, p.business),");
    expect(s).toContain("...fillEmpty(app.applicant as Record<string, unknown>, p.applicant),");
  });
  it("every address and phone field tells the browser what it is", () => {
    const s3 = readFileSync("src/wizard/Step3_Business.tsx", "utf8");
    for (const t of ["section-business organization", "section-business address-line1", "section-business address-level2", "section-business address-level1", "section-business postal-code", "section-business tel", "section-mailing address-line1", "section-mailing postal-code"]) expect(s3).toContain('autoComplete="' + t + '"');
    expect(readFileSync("src/wizard/Step4_Applicant.tsx", "utf8")).toContain('autoComplete="address-line1"');
    expect(readFileSync("src/components/RegionSelect.tsx", "utf8")).toContain('autoComplete = "address-level1"');
  });
});
