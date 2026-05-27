import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("BF_CLIENT_BLOCK_v52_SW_SKIP_WAITING_HANDLER_v1", () => {
  it("contains a SKIP_WAITING handler in service worker source", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../../sw.ts"), "utf8");
    expect(source).toMatch(/event\.data.*type\s*===\s*["']SKIP_WAITING["']/);
  });
});
