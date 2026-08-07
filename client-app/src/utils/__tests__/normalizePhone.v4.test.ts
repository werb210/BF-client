// BF_CLIENT_PHONE_LEADING_ONE_v4
import { describe, it, expect } from "vitest";
import { normalizePhone, isPlausibleNanpNational, PhoneFormatError } from "../normalizePhone";

describe("normalizePhone", () => {
  it("accepts a plain 10-digit number", () => {
    expect(normalizePhone("403 555 0123")).toBe("+14035550123");
    expect(normalizePhone("(825) 451-1768")).toBe("+18254511768");
  });

  it("accepts 11 digits with a leading country code", () => {
    expect(normalizePhone("+1 403 555 0123")).toBe("+14035550123");
    expect(normalizePhone("14035550123")).toBe("+14035550123");
  });

  it("rejects the country-code-plus-short-number case instead of double-prefixing", () => {
    // "+1 423-205-619" -> digits "1423205619" -> used to become "+11423205619"
    expect(() => normalizePhone("+1 423-205-619")).toThrow(PhoneFormatError);
    expect(() => normalizePhone("+1 325-400-209")).toThrow(PhoneFormatError);
  });

  it("says what is wrong when a digit is missing", () => {
    expect(() => normalizePhone("+1 423-205-619")).toThrow(/missing a digit/i);
    expect(() => normalizePhone("403 555")).toThrow(/too short/i);
  });

  it("rejects an impossible NPA or NXX", () => {
    expect(() => normalizePhone("+1 911 555 0123")).toThrow(PhoneFormatError);
    expect(() => normalizePhone("2035550123".replace("2", "0"))).toThrow(PhoneFormatError);
  });
});

describe("isPlausibleNanpNational", () => {
  it("is false for anything starting 0 or 1 in either position", () => {
    expect(isPlausibleNanpNational("1423205619")).toBe(false);
    expect(isPlausibleNanpNational("4031555012")).toBe(false);
  });
  it("is true for a real number", () => {
    expect(isPlausibleNanpNational("4035550123")).toBe(true);
  });
});
