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
    expect(payload.value).toBe(10000); // BF_CLIENT_COMMISSION_DEFAULT_2PCT_v721 - 2% of 500,000
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

  it("never includes a phone number (BF_CLIENT_v789_ANALYTICS_GATES)", () => {
    const data = buildAdsUserData("todd@boreal.financial") as Record<string, string>;
    expect(data).toEqual({ email: "todd@boreal.financial" });
    expect(data.phone_number).toBeUndefined();
  });

  it("rejects a string that is not an email address", () => {
    expect(buildAdsUserData("not-an-email").email).toBeUndefined();
  });

  it("returns an empty object when nothing is available", () => {
    for (const email of [null, undefined, ""]) {
      expect(Object.keys(buildAdsUserData(email))).toHaveLength(0);
    }
  });
});
