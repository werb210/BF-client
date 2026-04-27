// BF_CREDIT_BAND_v36 — Block 36
// Single source of truth for credit-score bands across Step 4 input and
// Step 2 eligibility filter. Mirror of BF-portal CREDIT_SCORE_BANDS.

export const CREDIT_SCORE_BANDS = [
  { label: "Under 560",  lower: 0,   upper: 559 },
  { label: "561 to 600", lower: 561, upper: 600 },
  { label: "600 to 660", lower: 600, upper: 660 },
  { label: "661 to 720", lower: 661, upper: 720 },
  { label: "Over 720",   lower: 720, upper: 9999 },
] as const;

export type CreditScoreBand = (typeof CREDIT_SCORE_BANDS)[number];

export function bandUpperBound(label?: string | null): number | null {
  if (!label) return null;
  const f = CREDIT_SCORE_BANDS.find((b) => b.label === label);
  return f ? f.upper : null;
}
