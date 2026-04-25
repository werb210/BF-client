import { describe, expect, it } from "vitest";
import { bucketFor, dedupeProductsByBucket } from "../categoryAliases";

describe("categoryAliases", () => {
  it("maps legacy short codes into canonical buckets", () => {
    expect(bucketFor("PO")).toBe("PURCHASE_ORDER_FINANCE");
    expect(bucketFor("PURCHASE_ORDER_FINANCE")).toBe("PURCHASE_ORDER_FINANCE");
    expect(bucketFor("equipment finance")).toBe("EQUIPMENT_FINANCE");
    expect(bucketFor("unknown")).toBeNull();
  });

  it("dedupes products by canonical bucket", () => {
    const buckets = dedupeProductsByBucket([
      { id: "a", category: "PO" },
      { id: "b", category: "PURCHASE_ORDER_FINANCE" },
      { id: "c", category: "TERM" },
    ]);

    expect(buckets).toEqual([
      {
        bucket: "TERM_LOAN",
        label: "Term Loan",
        products: [{ id: "c", category: "TERM" }],
      },
      {
        bucket: "PURCHASE_ORDER_FINANCE",
        label: "Purchase Order Financing",
        products: [
          { id: "a", category: "PO" },
          { id: "b", category: "PURCHASE_ORDER_FINANCE" },
        ],
      },
    ]);
  });
});
