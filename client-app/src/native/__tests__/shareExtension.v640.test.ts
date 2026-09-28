// BOREAL_SHARE_EXTENSION_v640 - the app appears in the iOS share sheet for photos AND documents.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const IOS = "ios/App";
const GROUP = "group.com.boreal.client";
const read = (p: string) => readFileSync(IOS + "/" + p, "utf8");

describe("share extension", () => {
  it("uses the app's shared folder", () => {
    expect(read("BorealShare/BorealShare.entitlements")).toContain(GROUP);
    expect(read("App/App.entitlements")).toContain(GROUP);
    expect(read("BorealShare/ShareViewController.swift")).toContain('appGroup = "' + GROUP + '"');
  });
  it("is a real target, built and embedded with the app", () => {
    const pbx = read("App.xcodeproj/project.pbxproj");
    expect(pbx).toContain("name = BorealShare; productName = BorealShare;");
    expect(pbx).toContain('productType = "com.apple.product-type.app-extension"');
    expect(pbx).toContain("BorealShare.appex in Embed");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.boreal.client.share;");
  });
  it("accepts photos and files from the share sheet", () => {
    const plist = read("BorealShare/Info.plist");
    expect(plist).toContain("com.apple.share-services");
    expect(plist).toContain("NSExtensionActivationSupportsImageWithMaxCount");
    expect(plist).toContain("NSExtensionActivationSupportsFileWithMaxCount");
    expect(plist).toContain("<string>ShareViewController</string>");
  });
});
