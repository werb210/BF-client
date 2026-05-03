// BF_CLIENT_BLOCK_v100_AMOUNT_COERCE_v1
// Pinned regression test: isAmountWithinRange must coerce string inputs
// because node-postgres ships NUMERIC columns as strings. Without this
// coercion the function returned true for every amount and v99's
// Step 2 amount-fit filter was a silent no-op.
import { describe, expect, it } from "vitest";
import { isAmountWithinRange } from "../productSelection";

describe("isAmountWithinRange — string coercion (v100)", () => {
  it("rejects non-positive / NaN amounts up front", () => {
    expect(isAmountWithinRange(0, 1000, 5000)).toBe(false);
    expect(isAmountWithinRange(-5, 1000, 5000)).toBe(false);
    expect(isAmountWithinRange(Number.NaN, 1000, 5000)).toBe(false);
  });

  it("treats null bounds as unbounded on either end", () => {
    expect(isAmountWithinRange(1, null, null)).toBe(true);
    expect(isAmountWithinRange(1_000_000, null, null)).toBe(true);
  });

  it("filters correctly when bounds are numbers (legacy shape)", () => {
    expect(isAmountWithinRange(4_999, 5_000, 200_000)).toBe(false);
    expect(isAmountWithinRange(5_000, 5_000, 200_000)).toBe(true);
    expect(isAmountWithinRange(200_000, 5_000, 200_000)).toBe(true);
    expect(isAmountWithinRange(200_001, 5_000, 200_000)).toBe(false);
  });

  it("filters correctly when bounds are strings (node-postgres shape)", () => {
    // This is the bug v100 fixes. Pre-fix, all four asserted true.
    expect(
      isAmountWithinRange(4_999, "5000" as unknown as number, "200000" as unknown as number)
    ).toBe(false);
    expect(
      isAmountWithinRange(5_000, "5000" as unknown as number, "200000" as unknown as number)
    ).toBe(true);
    expect(
      isAmountWithinRange(200_000, "5000" as unknown as number, "200000" as unknown as number)
    ).toBe(true);
    expect(
      isAmountWithinRange(200_001, "5000" as unknown as number, "200000" as unknown as number)
    ).toBe(false);
  });

  it("filters correctly with mixed string/number bounds", () => {
    expect(
      isAmountWithinRange(300_000, "5000" as unknown as number, 200_000)
    ).toBe(false);
    expect(
      isAmountWithinRange(300_000, 5_000, "200000" as unknown as number)
    ).toBe(false);
  });

  it("treats malformed string bounds as unbounded (non-finite -> skip)", () => {
    // "" / "abc" / null all coerce to NaN or pass through; result must
    // not falsely reject otherwise valid amounts.
    expect(
      isAmountWithinRange(1_000, "" as unknown as number, "" as unknown as number)
    ).toBe(true);
    expect(
      isAmountWithinRange(1_000, "abc" as unknown as number, "abc" as unknown as number)
    ).toBe(true);
  });

  it("real-world MCA case: $300k request is rejected by MCA $5k-$200k bounds", () => {
    // The exact production scenario from the v99/v100 audit.
    expect(
      isAmountWithinRange(300_000, "5000" as unknown as number, "200000" as unknown as number)
    ).toBe(false);
  });
});
