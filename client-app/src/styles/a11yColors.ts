// BF_CLIENT_v789_CONTRAST
// Colour pairs fixed in the v789 accessibility audit (items 111, 113, 114, 115).
// Every text/background pair here reaches WCAG AA: 4.5:1 for body text, 3:1 for
// large text. TSX styles import these; the matching CSS rules carry the same
// values with a comment naming the key. styles/__tests__/contrast.v789.test.ts
// checks every pair with the contrast helper below.

export const A11Y_COLORS = {
  // "Submitted" / "Confirmed" on the mini-portal forms, Call Us, "all caught up".
  successText: "#047857",
  // Offer expiry countdown.
  warningText: "#b45309",
  // Hang up and Cancel (call controls).
  dangerBg: "#b91c1c",
  dangerText: "#ffffff",
  // DocPicker buttons: solid (white on blue) and outline (blue on white).
  actionBg: "#1d4ed8",
  actionText: "#1d4ed8",
  // Disabled wizard buttons (components/ui/button.css).
  disabledBg: "#E4EAF2",
  disabledText: "#374151",
  // Offer card header and Recommended badge (MiniPortalPage.css).
  offerHeadBg: "#BF9B49",
  offerHeadText: "#1f2937",
  offerBadgeBg: "#f59e0b",
  offerBadgeText: "#1f2937",
  // LenderQaForm submit button while submitting.
  lenderQaDisabledBg: "#bfdbfe",
  lenderQaDisabledText: "#1e3a8a",
  // FaceIdSignInToggle button while busy.
  faceIdBusyBg: "#cbd5e1",
  faceIdBusyText: "#0f172a",
  // Own chat bubble and its timestamp (MessageThread.css): white at 90% opacity.
  ownBubbleBg: "#1d4ed8",
  ownTimestamp: "#ffffff",
  ownTimestampOpacity: 0.9,
  white: "#ffffff",
} as const;

type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG contrast ratio of `fg` (optionally translucent) drawn over `bg`. */
export function contrastRatio(fg: string, bg: string, fgOpacity = 1): number {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const a = Math.min(1, Math.max(0, fgOpacity));
  const mixed = f.map((c, i) => c * a + (b[i] as number) * (1 - a)) as Rgb;
  const l1 = relativeLuminance(mixed);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
