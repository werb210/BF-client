// BF_CLIENT_SBA_SUBMIT_CLOSES_v746
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("SBA forms return to the list after Submit", () => {
  it("1919 calls onComplete after a successful submit", () => {
    const s = readFileSync("src/pages/mini-portal/forms/forms/Sba1919Form.tsx", "utf8");
    expect(s.indexOf("onComplete();", s.indexOf("await submitFormResponse("))).toBeGreaterThan(0);
  });
  it("413 calls onComplete after a successful submit", () => {
    const s = readFileSync("src/pages/mini-portal/forms/forms/Sba413Form.tsx", "utf8");
    const at = s.indexOf("await submitFormResponse(");
    expect(s.indexOf("onComplete(); // BF_CLIENT_SBA_SUBMIT_CLOSES_v746", at)).toBeGreaterThan(at);
  });
});
