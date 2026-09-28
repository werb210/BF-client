// BF_CLIENT_WIDGET_BRAND_v631
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { actionLine, widgetPayload } from "../clientWidget";

describe("v631 widget action line", () => {
  it("says what to do in plain words", () => {
    expect(actionLine([])).toBe("Nothing to do");
    expect(actionLine([{ kind: "document" }])).toBe("Upload 1 document");
    expect(actionLine([{ kind: "document" }, { kind: "document" }])).toBe("Upload 2 documents");
    expect(actionLine([{ kind: "form" }])).toBe("Fill in 1 form");
    expect(actionLine([{ kind: "document" }, { kind: "form" }, { kind: "form" }])).toBe("Upload 1 document · Fill in 2 forms");
  });
  it("passes the action line to the widget", () => {
    expect(widgetPayload({ action: "Upload 1 document", todo: 1 })).toEqual({ action: "Upload 1 document", todo: 1 });
  });
  it("the native widget is branded and shows stage + action", () => {
    const swift = readFileSync("ios/App/ClientWidget/ClientWidget.swift", "utf-8");
    expect(swift).toContain("BF_CLIENT_WIDGET_BRAND_v631");
    expect(swift).toContain("Boreal Financial");
    expect(swift).toContain("borealNavy");
    expect(swift).toContain("s?.action");
    const plugin = readFileSync("ios/App/App/AppDelegate.swift", "utf-8");
    expect(plugin).toContain('current["action"] = action');
  });
});
