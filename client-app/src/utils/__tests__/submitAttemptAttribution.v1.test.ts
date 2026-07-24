// BF_CLIENT_TEST_REPAIR_v1 - jsdom sets import.meta.url to an http:// URL,
// so fileURLToPath() threw "The URL must be of scheme file" and the whole
// file failed at collection. process.cwd() is what the passing tests in
// this repo already use.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src", "utils", "submitAttempt.ts"), "utf-8");

describe("submit-attempt attribution", () => {
  it("includes ga_client_id and gclid in the beacon body", () => {
    expect(src).toContain("ga_client_id: readGaClientId()");
    expect(src).toContain("gclid: getAttribution().gclid");
    expect(src).toContain("_ga=GA");
  });
});
