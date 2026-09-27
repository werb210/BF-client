// BF_CLIENT_BLOCK_v591_ANDROID_WIDGET
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
describe("Android widget and app shortcuts", () => {
  it("registers the widget receiver and the long-press shortcuts", () => {
    expect(manifest).toContain('android:name=".ClientWidgetProvider"');
    expect(manifest).toContain('android:resource="@xml/client_widget_info"');
    expect(manifest).toContain('android:name="android.app.shortcuts" android:resource="@xml/shortcuts"');
  });
  it("shortcuts open links the app already understands", () => {
    const shortcuts = readFileSync("android/app/src/main/res/xml/shortcuts.xml", "utf8");
    for (const link of ["borealclient://home", "borealclient://documents", "borealclient://messages"]) expect(shortcuts).toContain(link);
  });
  it("the ClientWidget plugin exists on Android and the web side feeds it there", () => {
    expect(readFileSync("android/app/src/main/java/com/boreal/client/MainActivity.java", "utf8")).toContain("registerPlugin(ClientWidgetPlugin.class)");
    expect(readFileSync("android/app/src/main/java/com/boreal/client/ClientWidgetPlugin.java", "utf8")).toContain('@CapacitorPlugin(name = "ClientWidget")');
    expect(readFileSync("src/native/clientWidget.ts", "utf8")).toContain('Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("ClientWidget")');
  });
});
