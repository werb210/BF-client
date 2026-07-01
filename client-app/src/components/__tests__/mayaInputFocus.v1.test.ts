import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const src = readFileSync(fileURLToPath(new URL("../MayaWidget.tsx", import.meta.url)), "utf-8");
const form = src.split("<form onSubmit={handleSend}")[1].split("</form>")[0];

describe("Maya input keeps focus", () => {
  it("input is not disabled while sending", () => {
    expect(form).not.toContain("disabled={sending}");
  });
  it("input has a ref and send refocuses it", () => {
    expect(form).toContain("ref={inputRef}");
    expect(src).toContain("inputRef.current?.focus()");
  });
});
