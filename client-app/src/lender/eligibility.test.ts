import { describe, expect, it } from "vitest";
import { FundingIntent } from "../constants/wizard";
import {
  getEligibilityResult,
  NormalizedLenderProduct,
} from "./eligibility";

describe("lender product eligibility", () => {
  const products: NormalizedLenderProduct[] = [
    {
      productId: "loc_a",
      category: "Line of Credit",
      minAmount: 50000,
      maxAmount: 250000,
      supportedCountries: ["US"],
    },
    {
      productId: "loc_b",
      category: "Line of Credit",
      minAmount: 200000,
      maxAmount: 1000000,
      supportedCountries: ["US"],
    },
    {
      productId: "term_a",
      category: "Term Loan",
      minAmount: 300000,
      maxAmount: 800000,
      supportedCountries: ["US"],
    },
    {
      productId: "equip_a",
      category: "Equipment Financing",
      minAmount: 100000,
      maxAmount: 500000,
      supportedCountries: ["US"],
    },
  ];

  it("derives visible categories strictly from eligible products", () => {
    const result = getEligibilityResult(products, {
      fundingIntent: FundingIntent.WORKING_CAPITAL,
      amountRequested: 150000,
      businessLocation: "United States",
      accountsReceivableBalance: 0,
    });

    expect(result.eligibleProducts.map((product) => product.productId)).toEqual([
      "loc_a",
    ]);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("Line of Credit");
  });

  it("preserves the Accord lender flag on eligible products", () => {
    const accordProduct: NormalizedLenderProduct = {
      productId: "accord_loc",
      category: "Line of Credit",
      minAmount: 50000,
      maxAmount: 1000000,
      supportedCountries: ["CA"],
      isAccord: true,
    };

    const result = getEligibilityResult([accordProduct], {
      fundingIntent: FundingIntent.WORKING_CAPITAL,
      amountRequested: 250000,
      businessLocation: "Canada",
    });

    expect(result.eligibleProducts).toEqual([accordProduct]);
    expect(result.eligibleProducts[0].isAccord).toBe(true);
  });

  it("counts overlapping lender ranges within a category", () => {
    const result = getEligibilityResult(products, {
      fundingIntent: FundingIntent.BOTH,
      amountRequested: 220000,
      businessLocation: "United States",
      accountsReceivableBalance: 0,
    });

    const lineOfCredit = result.categories.find(
      (category) => category.name === "Line of Credit"
    );

    expect(lineOfCredit).toBeTruthy();
    expect(lineOfCredit?.productCount).toBe(2);
    expect(lineOfCredit?.minAmount).toBe(50000);
    expect(lineOfCredit?.maxAmount).toBe(1000000);
  });
});
