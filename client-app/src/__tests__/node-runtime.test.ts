import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import nvmrcContent from "../../../.nvmrc?raw";

describe("Node runtime configuration", () => {
  // BF_CLIENT_NODE_22_v1 - Node 20 reached end of life in April 2026 and Azure
  // flags it as deprecated. .nvmrc already said 22; engines now agrees.
  it("declares Node 22 in package.json engines", () => {
    expect(packageJson.engines?.node).toBe(">=22.0.0 <23");
  });

  it("pins Node 22 in the repo .nvmrc", () => {
    expect(nvmrcContent.trim()).toBe("22");
  });
});
