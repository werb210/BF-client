import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), "src", ...parts), "utf-8");
const page = read("pages", "AccountantPage.tsx");
const api = read("lib", "api.ts");
const stage2 = read("pages", "mini-portal", "forms", "Stage2Page.tsx");

describe("BF_CLIENT_ACCOUNTANT_FORMS_v2", () => {
  it("registers the same keys the applicant CMP registers", () => {
    for (const key of ["debt_stack", "professional_advisors", "cra_view_only_authorization", "real_estate_collateral_disclosure"]) {
      expect(page).toContain(`${key}:`);
      expect(stage2).toContain(`${key}:`);
    }
  });

  it("does not offer the personal net worth statement", () => {
    expect(page).not.toContain("net_worth_statement:");
    expect(page).not.toContain("PersonalNetWorthForm");
  });

  it("switches the shared form transport rather than forking the components", () => {
    expect(api).toContain("enableAccountantFormMode");
    expect(api).toContain("/api/accountant/applications/");
    expect(page).toContain("enableAccountantFormMode(() => getAccountantToken());");
  });

  it("hands the transport back when the page unmounts", () => {
    expect(page).toContain("return () => disableAccountantFormMode();");
    expect(api).toContain("accountantFormMode = null;");
  });

  it("leaves the applicant's own route intact when the mode is off", () => {
    expect(api).toContain("buildClientFormResponsesUrl");
    expect(api).toContain("/api/client/applications/");
  });

  it("skips any form the server names but the client cannot render", () => {
    expect(page).toContain("filter((f) => FORM_RENDERERS[f])");
  });

  it("carries Boreal branding", () => {
    expect(page).toContain("logo-boreal-mountains-white.svg");
    expect(page).toContain("Boreal Financial");
  });
});
