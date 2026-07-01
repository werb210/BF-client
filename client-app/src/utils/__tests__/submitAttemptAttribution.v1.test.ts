import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const src = readFileSync(fileURLToPath(new URL("../submitAttempt.ts", import.meta.url)), "utf-8");

describe("submit-attempt attribution", () => {
  it("includes ga_client_id and gclid in the beacon body", () => {
    expect(src).toContain("ga_client_id: readGaClientId()");
    expect(src).toContain("gclid: getAttribution().gclid");
    expect(src).toContain("_ga=GA");
  });
});
