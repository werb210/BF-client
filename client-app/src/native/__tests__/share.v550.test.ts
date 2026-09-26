// BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fileNameFromUrl, isSharedFileUrl, mimeFor } from "../sharedFiles";
describe("v550 shared files", () => {
  it("tells a shared file from a deep link", () => {
    expect(isSharedFileUrl("file:///var/mobile/Inbox/T2%202025.pdf")).toBe(true);
    expect(isSharedFileUrl("content://media/external/1")).toBe(true);
    expect(isSharedFileUrl("borealclient://application/abc")).toBe(false);
  });
  it("names and types the file", () => {
    expect(fileNameFromUrl("file:///x/Inbox/T2%202025.pdf")).toBe("T2 2025.pdf");
    expect(mimeFor("aging.XLSX")).toContain("spreadsheetml");
    expect(mimeFor("scan", "image/png")).toBe("image/png");
  });
  it("wiring: runtime, manifest, plist, activity", () => {
    expect(readFileSync("src/native/useNativeRuntime.ts", "utf-8")).toContain("isSharedFileUrl(url) ? void receiveSharedUrl(url) : navigate(parseNativeUrl(url))");
    expect(readFileSync("android/app/src/main/AndroidManifest.xml", "utf-8")).toContain("android.intent.action.SEND_MULTIPLE");
    expect(readFileSync("ios/App/App/Info.plist", "utf-8")).toContain("<key>CFBundleDocumentTypes</key>");
    expect(readFileSync("android/app/src/main/java/com/boreal/client/MainActivity.java", "utf-8")).toContain("registerPlugin(SharedFilesPlugin.class)");
    expect(readFileSync("src/app/App.tsx", "utf-8")).toContain("<ShareInbox />");
  });
});
