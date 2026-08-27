// BF_CLIENT_SBA413_SECTIONS_v129
// The 413 schedules are mandatory whenever their summary line is non-zero. A
// blank schedule on a filed form is a rejection, so these assert the collection
// exists and that the field names match what BF-Server writes to the PDF.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const form = readFileSync(resolve(__dirname, "..", "Sba413Form.tsx"), "utf-8");

describe("Section 3 - stocks and bonds", () => {
  it("is collected at all, which it was not before", () => {
    expect(form).toContain('table("securities", "Section 3 - Stocks and bonds"');
  });

  it("only appears when the summary line is non-zero", () => {
    expect(form).toContain('amount("asset_stocks_bonds") > 0 && table("securities"');
  });

  it.each(["name", "shares", "cost", "market_value", "quote_date", "total_value"])(
    "collects %s, which the server writes",
    (field) => {
      const i = form.indexOf('table("securities"');
      const block = form.slice(i, i + 900);
      expect(block).toContain(`field: "${field}"`);
    },
  );

  it("caps at the four rows the paper form holds", () => {
    expect(form).toMatch(/table\("securities"[\s\S]{0,200}?, 4, \[/);
  });
});

describe("Section 4 - real estate", () => {
  it.each([
    "address", "type", "date_purchased", "original_cost", "market_value",
    "mortgage_holder", "mortgage_account", "mortgage_balance", "payment", "mortgage_status",
  ])("collects %s", (field) => {
    const i = form.indexOf('table("properties"');
    const block = form.slice(i, i + 1600);
    expect(block).toContain(`field: "${field}"`);
  });

  it("collects all ten columns the form asks for", () => {
    const i = form.indexOf('table("properties"');
    const block = form.slice(i, i + 1600);
    expect((block.match(/field: "/g) || []).length).toBe(10);
  });

  it("still caps at three properties", () => {
    expect(form).toMatch(/table\("properties"[\s\S]{0,200}?, 3, \[/);
  });
});

describe("both schedules stay optional until they are required", () => {
  it("neither renders on an empty statement", () => {
    for (const gate of ['amount("asset_stocks_bonds") > 0', 'amount("asset_real_estate") > 0']) {
      expect(form).toContain(gate);
    }
  });
});
