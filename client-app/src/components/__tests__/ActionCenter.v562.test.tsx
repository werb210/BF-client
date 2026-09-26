// BF_CLIENT_BLOCK_v562
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const cmp = readFileSync("src/components/ActionCenter.tsx", "utf-8");
describe("v562 the to-do panel is for outstanding work only", () => {
  it("renders nothing when nothing is outstanding", () => {
    expect(cmp).toContain("if (outstanding.length === 0) return null;");
  });
  it("has no Completed list and no 'nothing outstanding' banner", () => {
    expect(cmp).not.toContain("completed.map");
    expect(cmp).not.toContain("we have everything we asked for");
  });
});
