// BF_CLIENT_STEP2_COMPARE_v187
import { describe, expect, it } from "vitest";
import { MAX_COMPARE, toggleCompare, canAddToCompare, buildCompareRows } from "../compareSelection";
import { CATEGORY_BUCKETS, descriptionFor } from "../categoryAliases";

const fmt = (n: number) => `$${n.toLocaleString("en-CA")}`;

describe("compare selection", () => {
  it("caps the tray at four products", () => {
    let ids: string[] = [];
    for (const id of ["a", "b", "c", "d", "e"]) ids = toggleCompare(ids, id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
    expect(ids).toHaveLength(MAX_COMPARE);
  });
  it("untoggles a product already in the tray even when full", () => {
    expect(toggleCompare(["a", "b", "c", "d"], "b")).toEqual(["a", "c", "d"]);
  });
  it("keeps a ticked product clickable when the tray is full", () => {
    const full = ["a", "b", "c", "d"];
    expect(canAddToCompare(full, "b")).toBe(true);
    expect(canAddToCompare(full, "e")).toBe(false);
  });
});

describe("compare rows", () => {
  const rows = buildCompareRows(fmt);
  const row = (key: string) => rows.find((r) => r.key === key)!;
  it("never exposes the lender behind a product", () => {
    const product = { name: "X", lender_name: "Some Lender", lender_id: "L1" };
    for (const r of rows) expect(r.value(product)).not.toContain("Some Lender");
  });
  it("renders full and one-sided amount ranges", () => {
    expect(row("amount").value({ amount_min: 10000, amount_max: 250000 })).toBe("$10,000 – $250,000");
    expect(row("amount").value({ amount_min: 10000, amount_max: null })).toBe("From $10,000");
    expect(row("amount").value({ amount_min: null, amount_max: 250000 })).toBe("Up to $250,000");
    expect(row("amount").value({})).toBe("Not published");
  });
  it("does not invent an unpublished rate", () => {
    expect(row("rate").value({ rate: null })).toBe("Quoted on approval");
    expect(row("rate").value({ rate: 12 })).toBe("12%");
    expect(row("rate").value({ rate: "9.5%" })).toBe("9.5%");
  });
  it("counts required documents without listing them", () => {
    expect(row("docs").value({ required_documents: ["a", "b"] })).toBe("2 documents");
    expect(row("docs").value({ required_documents: [] })).toBe("None listed");
  });
});

describe("category descriptions", () => {
  it("gives every one of the ten categories an explanation", () => {
    expect(CATEGORY_BUCKETS).toHaveLength(10);
    for (const bucket of CATEGORY_BUCKETS) expect(descriptionFor(bucket.id).length).toBeGreaterThan(40);
  });
  it("returns an empty string for an unknown bucket", () => expect(descriptionFor("NOPE")).toBe(""));
});
