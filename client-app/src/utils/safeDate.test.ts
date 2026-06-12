import { describe, expect, it } from "vitest";
import { safeParseDate } from "./safeDate";

describe("BF_CLIENT_BLOCK_v868 — safeParseDate", () => {
  it("parses the space-separated timestamp Safari rejects", () => {
    const d = safeParseDate("2026-06-12 14:44:00");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getTime()).toBe(new Date("2026-06-12T14:44:00").getTime());
  });
  it("preserves fractional seconds and timezone suffixes", () => {
    expect(Number.isNaN(safeParseDate("2026-06-12 14:44:00.123Z").getTime())).toBe(false);
    expect(safeParseDate("2026-06-12 14:44:00+00:00").getTime())
      .toBe(new Date("2026-06-12T14:44:00+00:00").getTime());
  });
  it("still parses already-ISO and date-only strings", () => {
    expect(Number.isNaN(safeParseDate("2026-06-12T14:44:00").getTime())).toBe(false);
    expect(Number.isNaN(safeParseDate("2026-06-12").getTime())).toBe(false);
  });
  it("returns Invalid Date for junk (isNaN guards keep working)", () => {
    expect(Number.isNaN(safeParseDate("not a date").getTime())).toBe(true);
    expect(Number.isNaN(safeParseDate("").getTime())).toBe(true);
    expect(Number.isNaN(safeParseDate(null).getTime())).toBe(true);
  });
  it("passes through Date and number inputs", () => {
    const now = new Date();
    expect(safeParseDate(now)).toBe(now);
    expect(safeParseDate(1_700_000_000_000).getTime()).toBe(1_700_000_000_000);
  });
});
