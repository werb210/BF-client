// BF_CLIENT_TEST_REPAIR_v1 - jsdom sets import.meta.url to an http:// URL,
// so fileURLToPath() threw "The URL must be of scheme file" and the whole
// file failed at collection. process.cwd() is what the passing tests in
// this repo already use.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const src = readFileSync(join(process.cwd(), "src", "components", "MayaWidget.tsx"), "utf-8");
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
