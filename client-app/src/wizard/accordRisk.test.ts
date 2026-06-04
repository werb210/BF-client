import { describe, expect, it } from "vitest";
import { isAccordLOCApp } from "./accordRisk";

describe("isAccordLOCApp", () => {
  it("returns true when an eligible Accord product is in the matched set", () => {
    expect(
      isAccordLOCApp({
        eligibleProducts: [
          { productId: "other", isAccord: false },
          { productId: "accord", isAccord: true },
        ],
      })
    ).toBe(true);
  });

  it("returns false when Accord is not among the eligible products", () => {
    expect(
      isAccordLOCApp({
        productCategory: "LINE_OF_CREDIT",
        kyc: { businessLocation: "Canada", fundingAmount: "500000" },
        eligibleProducts: [{ productId: "other", isAccord: false }],
      })
    ).toBe(false);
  });

  it("returns false when eligible products are missing", () => {
    expect(isAccordLOCApp({})).toBe(false);
  });
});
