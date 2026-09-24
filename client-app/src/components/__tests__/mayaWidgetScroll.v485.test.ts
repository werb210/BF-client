// BF_CLIENT_BLOCK_v485_MAYA_WIDGET_SCROLL
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const widget = readFileSync(resolve(__dirname, "../MayaWidget.tsx"), "utf8");

describe("v485 Maya widget scroll", () => {
  it("jumps to the bottom after layout, on new messages and typing changes", () => {
    expect(widget).toContain("requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; })");
    expect(widget).toContain("}, [messages, sending]);");
    expect(widget).not.toContain('behavior: "smooth" });\n  }, [messages]);');
  });
});
