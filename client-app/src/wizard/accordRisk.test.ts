import { describe, expect, it } from "vitest";
import { isAccordLOCApp } from "./accordRisk";

describe("isAccordLOCApp", () => {
  it("returns true when LOC is selected AND an Accord product is eligible", () => {
    expect(
      isAccordLOCApp({
        productCategory: "LINE_OF_CREDIT",
        eligibleProducts: [
          { productId: "other", isAccord: false },
          { productId: "accord", isAccord: true },
        ],
      })
    ).toBe(true);
  });

  it("BF_CLIENT_BLOCK_v863 — returns false for a non-LOC selection even when an Accord product is eligible", () => {
    expect(
      isAccordLOCApp({
        productCategory: "TERM_LOAN",
        eligibleProducts: [
          { productId: "term", isAccord: false },
          { productId: "accord", isAccord: true },
        ],
      })
    ).toBe(false);
    expect(
      isAccordLOCApp({
        productCategory: "EQUIPMENT_FINANCE",
        eligibleProducts: [{ productId: "accord", isAccord: true }],
      })
    ).toBe(false);
  });

  it("returns false when LOC is selected but Accord is not among the eligible products", () => {
    expect(
      isAccordLOCApp({
        productCategory: "LINE_OF_CREDIT",
        eligibleProducts: [{ productId: "other", isAccord: false }],
      })
    ).toBe(false);
  });

  it("returns false when eligible products are missing", () => {
    expect(isAccordLOCApp({})).toBe(false);
  });
});
