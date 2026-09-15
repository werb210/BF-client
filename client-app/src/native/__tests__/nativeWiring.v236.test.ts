// BF_CLIENT_NATIVE_WIRING_v236
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: {} }));

import { routeForPush } from "../pushListener";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const APP = "11111111-2222-4333-8444-555555555555";

describe("push routing", () => {
  it("Upload Now opens the document picker on the right application", () => {
    expect(routeForPush("UPLOAD_NOW", { url: "borealclient://documents", applicationId: APP }))
      .toBe(`/application/${APP}?section=documents`);
  });
  it("View Offer and Open Application open the application", () => {
    expect(routeForPush("VIEW_OFFER", { url: `borealclient://application/${APP}`, applicationId: APP }))
      .toBe(`/application/${APP}`);
    expect(routeForPush("OPEN_APPLICATION", { applicationId: APP })).toBe(`/application/${APP}`);
  });
  it("a plain tap on a document request is scoped to its application", () => {
    expect(routeForPush("tap", { url: "borealclient://documents", applicationId: APP }))
      .toBe(`/application/${APP}?section=documents`);
  });
  it("never routes to an id that is not a uuid", () => {
    expect(routeForPush("UPLOAD_NOW", { applicationId: "../../admin" })).toBe("/portal?section=documents");
    expect(routeForPush("tap", { url: "https://evil.example" })).toBe("/portal");
  });
});

describe("iOS native wiring", () => {
  it("registers the VisionKit scanner with the bridge", () => {
    expect(read("ios/App/App/BorealBridgeViewController.swift")).toContain("registerPluginInstance(DocumentScannerPlugin())");
  });
  it("declares the Face ID usage string iOS requires before prompting", () => {
    expect(read("ios/App/App/Info.plist")).toContain("<key>NSFaceIDUsageDescription</key>");
  });
});

describe("mini-portal Action Center", () => {
  const src = read("src/pages/MiniPortalPage.tsx");
  it("passes an action handler so Upload and Review buttons render", () => {
    expect(src).toContain("onAction={onActionCenterItem}");
  });
  it("opens the picker for the specific document and for ?section=documents", () => {
    expect(src).toContain("documentType={pickerDoc?.type}");
    expect(src).toContain('searchParams.get("section") === "documents"');
  });
});
