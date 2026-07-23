// BF_CLIENT_PHONE_LEADING_ONE_v1
import { describe, it, expect } from "vitest";
import { formatPhoneNumber } from "../location";

describe("formatPhoneNumber strips a leading NANP country code", () => {
  it("keeps all ten real digits when a leading 1 is typed", () => {
    // The exact production corruption: last digit was being eaten.
    expect(formatPhoneNumber("17059300053", "CA")).toBe("(705) 930-0053");
    expect(formatPhoneNumber("1 705 930 0053", "CA")).toBe("(705) 930-0053");
    expect(formatPhoneNumber("+1 (705) 930-0053", "CA")).toBe("(705) 930-0053");
  });

  it("leaves a plain ten-digit number alone", () => {
    expect(formatPhoneNumber("7059300053", "CA")).toBe("(705) 930-0053");
    expect(formatPhoneNumber("5878881837", "US")).toBe("(587) 888-1837");
  });

  it("does not strip a legitimate leading 1 from a ten-digit string", () => {
    // 10 digits starting with 1 is not a country code, so it must be preserved
    // verbatim rather than silently shortened.
    expect(formatPhoneNumber("1234567890", "CA")).toBe("(123) 456-7890");
  });

  it("still formats partial input while typing", () => {
    expect(formatPhoneNumber("70", "CA")).toBe("70");
    expect(formatPhoneNumber("70593", "CA")).toBe("(705) 93");
  });

  it("leaves non-NANP countries untouched", () => {
    expect(formatPhoneNumber("447911123456", "GB")).toBe("447911123456");
  });
});
