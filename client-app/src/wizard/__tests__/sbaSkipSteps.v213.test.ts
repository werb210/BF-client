// BF_CLIENT_SBA_SKIP_2_AND_5_v213
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeAllowedCategories } from "../eligibilityRules";

const step5 = readFileSync(resolve(__dirname, "..", "Step5_Documents.tsx"), "utf-8");

describe("Step 2 collapses to one bucket", () => {
  const usStartup = {
    lookingFor: "capital", location: "US", purpose: "startup", years: "0",
  } as any;

  it("a US start-up sees SBA only", () => {
    expect(computeAllowedCategories(usStartup)).toEqual(["SBA"]);
  });

  it("no longer offers Line of Credit or Term Loan", () => {
    const allowed = computeAllowedCategories(usStartup);
    expect(allowed).not.toContain("LOC");
    expect(allowed).not.toContain("TERM");
  });

  it("a Canadian start-up still resolves to STARTUP", () => {
    const caStartup = { lookingFor: "capital", location: "CA", purpose: "startup", years: "0" } as any;
    expect(computeAllowedCategories(caStartup)).toEqual(["STARTUP"]);
  });

  it("other purposes are untouched", () => {
    const wc = { lookingFor: "capital", location: "US", purpose: "working_capital", years: ">3" } as any;
    expect(computeAllowedCategories(wc).length).toBeGreaterThan(1);
  });
});

describe("Step 5 refuses the SBA path", () => {
  it("redirects to Review", () => {
    expect(step5).toContain('navigate("/apply/step-6", { replace: true })');
  });

  it("renders nothing rather than flashing the document list", () => {
    expect(step5).toContain("if (onSbaPath) return null;");
  });

  it("sets the flags the submit gate depends on", () => {
    expect(step5).toContain("update({ currentStep: 6, documentsDeferred: true })");
  });

  it("guards at the destination, so a bookmark or Back cannot land here", () => {
    // BF_CLIENT_SBA_PATH_FROM_PRODUCT_v160 - now decided by the product.
    expect(step5).toContain("isSbaWizardPath(app as Record<string, unknown>)");
    expect(step5).toContain("if (onSbaPath) return null;");
  });
});
