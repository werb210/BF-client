// BF_CLIENT_ADS_CONVERSION_VALUE_v2
import { describe, expect, it } from "vitest";
import {
  ADS_CONVERSION_SEND_TO,
  buildAdsConversionPayload,
  buildAdsUserData,
  estimateClientCommission,
} from "@/utils/analytics";

describe("Google Ads conversion payload", () => {
  it("always targets the Apply conversion action", () => {
    expect(buildAdsConversionPayload(0).send_to).toBe(ADS_CONVERSION_SEND_TO);
    expect(ADS_CONVERSION_SEND_TO).toContain("AW-18248196538");
  });

  it("reports commission as the value, in CAD", () => {
    const payload = buildAdsConversionPayload(estimateClientCommission(500000));
    expect(payload.value).toBe(15000);
    expect(payload.currency).toBe("CAD");
  });

  it("distinguishes a large file from a small one", () => {
    const big = buildAdsConversionPayload(estimateClientCommission(500000));
    const small = buildAdsConversionPayload(estimateClientCommission(25000));
    expect(big.value).toBeGreaterThan(small.value as number);
  });

  it("rounds to two decimal places", () => {
    expect(buildAdsConversionPayload(1234.5678).value).toBe(1234.57);
  });

  it("omits value rather than sending zero when the amount is missing", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const payload = buildAdsConversionPayload(bad);
      expect(payload.value).toBeUndefined();
      expect(payload.currency).toBeUndefined();
    }
  });

  it("passes a transaction id so Ads can deduplicate a retried submit", () => {
    expect(buildAdsConversionPayload(100, "app-123").transaction_id).toBe("app-123");
  });

  it("omits transaction id when there is none", () => {
    for (const bad of [undefined, null, "", "   "]) {
      expect(buildAdsConversionPayload(100, bad).transaction_id).toBeUndefined();
    }
  });
});

// BF_CLIENT_ADS_ENHANCED_CONVERSIONS_v3
describe("enhanced conversions user data", () => {
  it("normalizes email to lowercase and trims it", () => {
    expect(buildAdsUserData("  Todd@Boreal.Financial ").email).toBe(
      "todd@boreal.financial"
    );
  });

  it("converts a ten-digit number to E.164", () => {
    expect(buildAdsUserData(null, "403-555-0142").phone_number).toBe("+14035550142");
  });

  it("accepts a number already carrying the country code", () => {
    expect(buildAdsUserData(null, "+1 403 555 0142").phone_number).toBe("+14035550142");
  });

  it("keeps the email when the phone is malformed, rather than throwing", () => {
    const data = buildAdsUserData("todd@boreal.financial", "423-205-619");
    expect(data.email).toBe("todd@boreal.financial");
    expect(data.phone_number).toBeUndefined();
  });

  it("rejects a string that is not an email address", () => {
    expect(buildAdsUserData("not-an-email").email).toBeUndefined();
  });

  it("returns an empty object when nothing is available", () => {
    const cases: Array<[string | null | undefined, string | null | undefined]> = [
      [null, null],
      [undefined, undefined],
      ["", ""],
    ];
    for (const [email, phone] of cases) {
      expect(Object.keys(buildAdsUserData(email, phone))).toHaveLength(0);
    }
  });
});
