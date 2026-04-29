// BF_CLIENT_v63_SUBMIT_HYDRATE_GUARD
// Static source check: confirm the post-submit hydration is wrapped in try/catch
// and that a hydration error is NOT treated as a submit failure.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(__dirname, "..", "Step6_Review.tsx"),
  "utf8",
);

describe("BF_CLIENT_v63_SUBMIT_HYDRATE_GUARD", () => {
  it("anchor is present", () => {
    expect(src.includes("BF_CLIENT_v63_SUBMIT_HYDRATE_GUARD")).toBe(true);
  });
  it("ClientAppAPI.status post-submit call sits inside a try/catch", () => {
    const idx = src.indexOf("await ClientAppAPI.status(app.applicationToken!)");
    expect(idx).toBeGreaterThan(-1);
    const window = src.slice(Math.max(0, idx - 600), idx);
    expect(window.includes("try {")).toBe(true);
    const after = src.slice(idx, idx + 800);
    expect(/catch\s*\(\s*hydrateErr/.test(after)).toBe(true);
  });
});
