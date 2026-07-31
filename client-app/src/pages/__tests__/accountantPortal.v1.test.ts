import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), "src", ...parts), "utf-8");
const apiModule = read("api", "accountant.ts");
const page = read("pages", "AccountantPage.tsx");
const router = read("router", "AppRouter.tsx");

describe("BF_CLIENT_ACCOUNTANT_PORTAL_v1", () => {
  it("keeps the accountant token out of the applicant's slot", () => {
    expect(apiModule).toContain('"boreal_accountant_token"');
    expect(apiModule).not.toContain("@/auth/token");
  });
  it("declares itself an accountant when verifying", () => expect(apiModule).toContain('userType: "accountant"'));
  it("routes /accountant outside the client OTP guard", () => {
    expect(router).toContain('<Route path="/accountant" element={<AccountantPage />} />');
    expect(router).not.toContain("<RequireOTP><AccountantPage /></RequireOTP>");
  });
  it("explains the two sign-in refusals the server distinguishes", () => {
    expect(page).toContain("no_accountant_for_phone"); expect(page).toContain("ambiguous_accountant_phone");
  });
  it("names upload errors", () => {
    expect(page).toContain("UNSUPPORTED_FILE_TYPE"); expect(page).toContain("APPLICATION_NOT_ACCEPTING_UPLOADS");
  });
  it("signs out when the token stops working", () => expect(page).toContain("clearAccountantToken();"));
  it("supports mobile autofill", () => {
    expect(page).toContain('autoComplete="one-time-code"'); expect(page).toContain('autoComplete="tel"');
  });
});
