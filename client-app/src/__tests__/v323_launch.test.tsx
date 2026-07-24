// BF_CLIENT_BLOCK_v323_MOBILE_FIRST_LAUNCH_v1
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.resolve(__dirname, "..");
const r = (p: string) => fs.readFileSync(path.resolve(root, p), "utf8");

const otpPage = r("pages/OtpPage.tsx");
const otpInput = r("components/OtpInput.tsx");
const thread = r("components/messaging/MessageThread.tsx");
const docPicker = r("components/DocPicker.tsx");
const mobileHeader = r("components/MobileHeader.tsx");

describe("v323 — OTP pattern (C)", () => {
  it("OtpPage no longer passes \d{4,8}", () => {
    expect(otpPage).not.toMatch(/pattern="\\d\{4,8\}"/);
  });
  it("OtpPage uses single-digit pattern", () => {
    expect(otpPage).toMatch(/pattern="\\\\d"/);
  });
  it("OtpInput defensively coerces multi-digit pattern", () => {
    expect(otpInput).toMatch(/effectivePattern/);
  });
});

describe("v323 — MessageThread auto-scroll (B)", () => {
  it("uses scrollIntoView on the last item", () => {
    expect(thread).toMatch(/scrollIntoView/);
    expect(thread).toMatch(/endRef/);
  });
  it("triggered on items.length change", () => {
    expect(thread).toMatch(/useEffect[\s\S]+\[items\.length\]/);
  });
});

describe("v323 — DocPicker error surfacing (D)", () => {
  it("differentiates 401/413/415", () => {
    expect(docPicker).toMatch(/Session expired/);
    expect(docPicker).toMatch(/too large/);
    // BF_CLIENT_TEST_REPAIR_v1 - DocPicker copy reworded to "is not supported".
    expect(docPicker).toMatch(/file type is not supported/);
  });
  it("logs detail to console", () => {
    expect(docPicker).toMatch(/console\.error\("\[DocPicker upload\] failed:"/);
  });
});

describe("v323 — Mobile header (A)", () => {
  it("MobileHeader has a hamburger button", () => {
    expect(mobileHeader).toMatch(/aria-label=\{open \? "Close menu" : "Open menu"\}/);
  });
  it("44x44px touch target on hamburger", () => {
    expect(mobileHeader).toMatch(/h-11\s+w-11/);
  });
  it("menu uses z-\\[70\\] above content", () => {
    expect(mobileHeader).toMatch(/z-\[70\]/);
  });
});
