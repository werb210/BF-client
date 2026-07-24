// BF_CLIENT_TEST_REPAIR_v1 - jsdom sets import.meta.url to an http:// URL,
// so fileURLToPath() threw "The URL must be of scheme file" and the whole
// file failed at collection. process.cwd() is what the passing tests in
// this repo already use.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src", "components", "MayaWidget.tsx"), "utf-8");

describe("Maya call carries the signed-in token", () => {
  it("imports getToken and attaches a Bearer token to the maya request", () => {
    expect(src).toContain('import { getToken } from "@/auth/token"');
    expect(src).toContain("Authorization: `Bearer ${getToken()}`");
  });
});
