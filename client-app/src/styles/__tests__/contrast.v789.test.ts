// BF_CLIENT_v789_CONTRAST - every colour pair changed in audit items 111, 113,
// 114 and 115 reaches WCAG AA (4.5:1 body text, 3:1 large text).
import { describe, expect, it } from "vitest";
import { A11Y_COLORS as C, AA_LARGE_TEXT, AA_TEXT, contrastRatio } from "../a11yColors";

describe("contrast helper", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1 boundary colour.
    expect(contrastRatio("#767676", "#fff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#fff")).toBeLessThan(4.5);
  });

  it("accounts for a translucent foreground", () => {
    expect(contrastRatio("#ffffff", "#000000", 0.5)).toBeLessThan(contrastRatio("#ffffff", "#000000"));
  });

  it("flags the old failing pairs, so the test can tell pass from fail", () => {
    expect(contrastRatio("#ffffff", "#BF9B49")).toBeLessThan(AA_TEXT); // old offer head
    expect(contrastRatio("#10b981", "#ffffff")).toBeLessThan(AA_TEXT); // old Submitted
    expect(contrastRatio("#8593aa", "#E4EAF2")).toBeLessThan(AA_TEXT); // old disabled button
    expect(contrastRatio("#ffffff", "#2563eb", 0.6)).toBeLessThan(AA_TEXT); // old timestamp
    expect(contrastRatio("#ffffff", "#ef4444")).toBeLessThan(AA_TEXT); // old hang-up
  });
});

const pairs: Array<[string, string, string, number?, number?]> = [
  ["offer card header text on gold", C.offerHeadText, C.offerHeadBg],
  ["Recommended badge text on amber", C.offerBadgeText, C.offerBadgeBg],
  ["Submitted / Confirmed / Call Us / all caught up green on white", C.successText, C.white],
  ["offer expiry amber on white", C.warningText, C.white],
  ["disabled wizard button", C.disabledText, C.disabledBg],
  ["LenderQaForm submit while submitting", C.lenderQaDisabledText, C.lenderQaDisabledBg],
  ["Face ID toggle while busy", C.faceIdBusyText, C.faceIdBusyBg],
  ["own-message timestamp (white at 90%)", C.ownTimestamp, C.ownBubbleBg, C.ownTimestampOpacity],
  ["DocPicker solid button", C.white, C.actionBg],
  ["DocPicker outline button", C.actionText, C.white],
  ["hang up / Cancel", C.dangerText, C.dangerBg],
  // Offer action results (MiniPortalPage.css .mp-offer__notice--*).
  ["offer success notice", C.successText, "#ecfdf5"],
  ["offer error notice", C.dangerBg, "#fef2f2"],
];

describe("changed colour pairs pass AA", () => {
  it.each(pairs)("%s", (_label, fg, bg, opacity = 1, min = AA_TEXT) => {
    expect(contrastRatio(fg, bg, opacity)).toBeGreaterThanOrEqual(min);
  });

  it("large-text threshold is 3:1", () => {
    expect(AA_LARGE_TEXT).toBe(3);
  });
});
