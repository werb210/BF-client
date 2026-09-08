// BF_CLIENT_BLOCK_v205_VISIONKIT_SCANNER_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const swift = path.join(root, "ios/App/App/DocumentScannerPlugin.swift");
const pbx = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");

describe("iOS document scanner is natively implemented", () => {
  it("ships a VisionKit plugin registered as DocumentScanner", () => {
    const src = fs.readFileSync(swift, "utf8");
    expect(src).toContain("VNDocumentCameraViewController");
    expect(src).toMatch(/jsName\s*=\s*"DocumentScanner"/);
    expect(src).toMatch(/CAPPluginMethod\(name:\s*"scanDocument"/);
    expect(src).toContain("scannedImages");
  });

  it("is compiled into the App target", () => {
    const project = fs.readFileSync(pbx, "utf8");
    expect(project).toContain("DocumentScannerPlugin.swift in Sources");
  });
});
