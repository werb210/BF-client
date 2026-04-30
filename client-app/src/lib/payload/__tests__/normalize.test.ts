import { describe, expect, it } from "vitest";
import { buildSubmitBody } from "../buildSubmitBody";
import { normalizeEmail, normalizePhone } from "../normalize";

describe("normalizePhone", () => {
  it("returns null for empty", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("normalizes North America numbers", () => {
    expect(normalizePhone("(416) 555-1234")).toBe("+14165551234");
    expect(normalizePhone("14165551234")).toBe("+14165551234");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims values", () => {
    expect(normalizeEmail(" Foo@Bar.com ")).toBe("foo@bar.com");
  });
});

describe("buildSubmitBody", () => {
  it("normalizes company/applicant contact fields and mirrors legacy keys", () => {
    const out = buildSubmitBody({
      app: {
        business: { companyName: "ACME", email: "TEAM@ACME.COM", phone: "4165551212" },
        applicant: { firstName: "Jane", lastName: "Doe", email: " J@D.COM ", phone: "(416) 555-3434" },
      },
    });
    expect(out.app.business.email).toBe("team@acme.com");
    expect(out.app.business.phone).toBe("+14165551212");
    expect(out.normalized.company.name).toBe("ACME");
    expect(out.normalized.applicant.first_name).toBe("Jane");
    expect(out.normalized.applicant.phone).toBe("+14165553434");
  });
});
