// BF_CLIENT_v63_QUEUE_MAX_ATTEMPTS
// Static source check: confirm the queue worker has a max-attempts cap and
// deletes items when the cap is reached.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(__dirname, "..", "uploadQueue.ts"),
  "utf8",
);

describe("BF_CLIENT_v63_QUEUE_MAX_ATTEMPTS", () => {
  it("anchor is present", () => {
    expect(src.includes("BF_CLIENT_v63_QUEUE_MAX_ATTEMPTS")).toBe(true);
  });
  it("MAX_ATTEMPTS constant exists and is at least 3", () => {
    const m = src.match(/const\s+MAX_ATTEMPTS\s*=\s*(\d+)\s*;/);
    expect(m).not.toBeNull();
    if (m) expect(Number(m[1])).toBeGreaterThanOrEqual(3);
  });
  it("retry path deletes the item once the cap is reached", () => {
    expect(/nextAttempts\s*>=\s*MAX_ATTEMPTS/.test(src)).toBe(true);
    expect(/store\.delete\(item\.id\)/.test(src)).toBe(true);
  });
});
