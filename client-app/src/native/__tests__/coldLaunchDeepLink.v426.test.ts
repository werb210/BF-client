// BF_CLIENT_COLD_LAUNCH_DEEPLINK_v426
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseNativeUrl } from "../deepLinks";
const src = readFileSync(path.join(process.cwd(), "src/native/useNativeRuntime.ts"), "utf8");

describe("v426 a link that launches the app from closed still routes", () => {
  it("reads the launch URL iOS only delivers once", () => {
    expect(src).toContain("getLaunchUrl()");
  });

  it("reads it before any listener is attached, so a live event wins", () => {
    expect(src.indexOf("getLaunchUrl()")).toBeLessThan(src.indexOf('addListener("appUrlOpen"'));
  });

  it("replaces history so back does not return to a blank start route", () => {
    expect(src).toContain("{ replace: true }");
  });

  it("does nothing when there is no launch URL", () => {
    expect(src).toContain("launch?.url ? parseNativeUrl(launch.url) : null");
  });

  it("still parses the routes a cold launch would carry", () => {
    expect(parseNativeUrl("borealclient://application/abc-123")).toBe("/application/abc-123");
    expect(parseNativeUrl("https://evil.example.com/application/1")).not.toContain("evil");
  });
});
