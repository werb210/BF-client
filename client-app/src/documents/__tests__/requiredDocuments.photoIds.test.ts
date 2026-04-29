// BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — verifies the always-required
// list reflects partner state, since partner_applicant_id is the
// only conditional entry. Bank statements + primary photo ID are
// always present.
import { describe, expect, it } from "vitest";
import {
  ensureAlwaysRequiredDocuments,
} from "../requiredDocuments";
import type { LenderProductRequirement } from "../../wizard/requirements";

describe("BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — ensureAlwaysRequiredDocuments + hasPartner", () => {
  it("includes primary_applicant_id without hasPartner; excludes partner_applicant_id", () => {
    const out = ensureAlwaysRequiredDocuments([]);
    const docTypes = out.map((e) => e.document_type).sort();
    expect(docTypes).toContain("bank_statements");
    expect(docTypes).toContain("primary_applicant_id");
    expect(docTypes).not.toContain("partner_applicant_id");
  });

  it("includes partner_applicant_id when hasPartner is true", () => {
    const out = ensureAlwaysRequiredDocuments([], { hasPartner: true });
    const docTypes = out.map((e) => e.document_type).sort();
    expect(docTypes).toContain("bank_statements");
    expect(docTypes).toContain("primary_applicant_id");
    expect(docTypes).toContain("partner_applicant_id");
  });

  it("preserves existing requirements untouched alongside the always-required entries", () => {
    const existing: LenderProductRequirement[] = [
      {
        id: "tax_returns",
        document_type: "tax_returns",
        required: true,
        min_amount: null,
        max_amount: null,
      },
    ];
    const out = ensureAlwaysRequiredDocuments(existing, { hasPartner: false });
    const docTypes = out.map((e) => e.document_type).sort();
    expect(docTypes).toEqual(
      ["bank_statements", "primary_applicant_id", "tax_returns"].sort()
    );
  });

  it("marks all always-required entries as required=true", () => {
    const out = ensureAlwaysRequiredDocuments([], { hasPartner: true });
    const primary = out.find((e) => e.document_type === "primary_applicant_id");
    const partner = out.find((e) => e.document_type === "partner_applicant_id");
    expect(primary?.required).toBe(true);
    expect(partner?.required).toBe(true);
  });
});

// BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60_TEST_ANCHOR
