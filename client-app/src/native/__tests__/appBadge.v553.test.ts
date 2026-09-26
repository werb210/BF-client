// BF_CLIENT_BLOCK_v553_APP_BADGE
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { badgeCount } from "../appBadge";

describe("v553 app badge", () => {
  it("clamps the count", () => {
    expect(badgeCount(3)).toBe(3);
    expect(badgeCount(-1)).toBe(0);
    expect(badgeCount("x")).toBe(0);
    expect(badgeCount(250)).toBe(99);
  });
  it("is set from the action center and cleared on sign-out", () => {
    expect(readFileSync("src/components/ActionCenter.tsx", "utf-8")).toContain("m.setAppBadge(d.outstandingCount)");
    expect(readFileSync("src/auth/token.ts", "utf-8")).toContain("m.clearAppBadge()");
    expect(readFileSync("ios/App/App/BorealBridgeViewController.swift", "utf-8")).toContain("registerPluginInstance(AppBadgePlugin())");
    expect(readFileSync("ios/App/App/AppDelegate.swift", "utf-8")).toContain('jsName = "AppBadge"');
  });
});
