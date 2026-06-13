import { describe, it, expect } from "vitest";
import { Validate } from "../validate";

describe("Validate.phone (NANP)", () => {
  it("accepts valid North American numbers in any format", () => {
    for (const v of ["4035551234", "(416) 555-1234", "+1 604 555 1234", "16475551234", "+16475551234"]) {
      expect(Validate.phone(v)).toBe(true);
    }
  });
  it("rejects malformed numbers (the +11234567891 class)", () => {
    for (const v of ["1234567891", "+11234567891", "5551234567", "123", "", "abc", "40355512", "1"]) {
      expect(Validate.phone(v)).toBe(false);
    }
  });
  it("does not throw on non-string input", () => {
    expect(Validate.phone(undefined)).toBe(false);
    expect(Validate.phone(null)).toBe(false);
  });
});
