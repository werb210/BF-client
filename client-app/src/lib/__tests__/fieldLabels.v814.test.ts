// BF_CLIENT_v814_FIELD_LABELS - fields are named by the label the applicant sees, never by what they typed.
import { describe, expect, it } from "vitest";
import { fieldName } from "@/lib/clientBehaviour";

function build(html: string): Element {
  document.body.innerHTML = html;
  return document.querySelector("[data-t]")!;
}

describe("field names for the visitor journey", () => {
  it("uses the visible label, not the code name", () => {
    expect(fieldName(build('<label for="a">Annual revenue *</label><input id="a" name="annualRevenue" data-t value="250000">'))).toBe("Annual revenue");
  });
  it("leaves out the options and the value inside a wrapping label", () => {
    const el = build('<label>Province <select data-t name="prov"><option selected>Alberta</option><option>Ontario</option></select></label>');
    expect(fieldName(el)).toBe("Province");
  });
  it("falls back to aria-label, then placeholder, then name", () => {
    expect(fieldName(build('<input data-t aria-label="Business name" name="biz">'))).toBe("Business name");
    expect(fieldName(build('<input data-t placeholder="Email address" name="email">'))).toBe("Email address");
    expect(fieldName(build('<input data-t name="phone">'))).toBe("phone");
  });
  it("skips auto-generated ids", () => {
    expect(fieldName(build('<input data-t id=":r3:">'))).toBe("field");
  });
});
