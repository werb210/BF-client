export enum FundingIntent {
  WORKING_CAPITAL = "WORKING_CAPITAL",
  EQUIPMENT = "EQUIPMENT",
  BOTH = "BOTH",
}

export const FUNDING_INTENT_LABELS: Record<FundingIntent, string> = {
  [FundingIntent.WORKING_CAPITAL]: "Working Capital",
  [FundingIntent.EQUIPMENT]: "Equipment Financing",
  [FundingIntent.BOTH]: "Working Capital & Equipment",
};

export const FUNDING_INTENT_OPTIONS = [
  {
    value: FundingIntent.WORKING_CAPITAL,
    label: FUNDING_INTENT_LABELS[FundingIntent.WORKING_CAPITAL],
  },
  {
    value: FundingIntent.EQUIPMENT,
    label: FUNDING_INTENT_LABELS[FundingIntent.EQUIPMENT],
  },
  {
    value: FundingIntent.BOTH,
    label: FUNDING_INTENT_LABELS[FundingIntent.BOTH],
  },
];

export function normalizeFundingIntent(value?: string): FundingIntent | "" {
  if (!value) return "";
  const trimmed = value.trim();
  if ((Object.values(FundingIntent) as string[]).includes(trimmed)) {
    return trimmed as FundingIntent;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === "capital") return FundingIntent.WORKING_CAPITAL;
  if (normalized === "equipment") return FundingIntent.EQUIPMENT;
  if (normalized === "equipment financing") return FundingIntent.EQUIPMENT;
  if (normalized === "both") return FundingIntent.BOTH;
  if (normalized === "capital & equipment") return FundingIntent.BOTH;
  if (normalized === "both capital & equipment") return FundingIntent.BOTH;
  if (normalized === "working capital") return FundingIntent.WORKING_CAPITAL;
  return "";
}

export function getFundingIntentLabel(value?: string) {
  const intent = normalizeFundingIntent(value);
  if (!intent) return "";
  return FUNDING_INTENT_LABELS[intent];
}
