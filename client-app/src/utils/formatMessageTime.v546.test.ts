// BF_CLIENT_BLOCK_v546
import { describe, expect, it } from "vitest";
import { formatMessageTime } from "./safeDate";
const now = new Date(2026, 8, 26, 12, 0);
describe("v546 message timestamps", () => {
  it("today shows only the time", () => {
    expect(formatMessageTime(new Date(2026, 8, 26, 9, 5), now)).not.toMatch(/Sep/);
  });
  it("another day adds the date", () => {
    expect(formatMessageTime("2026-09-15 18:48:00", now)).toMatch(/Sep.*15/);
  });
  it("another year adds the year", () => {
    expect(formatMessageTime(new Date(2025, 0, 2, 8, 0), now)).toMatch(/2025/);
  });
  it("bad input is blank, not Invalid Date", () => {
    expect(formatMessageTime("nope", now)).toBe("");
  });
});
