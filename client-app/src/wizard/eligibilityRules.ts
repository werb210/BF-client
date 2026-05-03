// BF_CLIENT_BLOCK_v92_FULL_WIZARD_FINALIZE_v1
import type { NormalizedLenderProduct } from "@/lender/eligibility";

export type Cat =
  | "LOC" | "TERM" | "EQUIPMENT" | "FACTORING" | "PO"
  | "MCA" | "MEDIA" | "ABL" | "SBA" | "STARTUP";

export const ALL_CATEGORIES: readonly Cat[] = [
  "LOC","TERM","EQUIPMENT","FACTORING","PO","MCA","MEDIA","ABL","SBA","STARTUP",
] as const;

const ALL_MINUS_EQUIPMENT: readonly Cat[] =
  ALL_CATEGORIES.filter((c) => c !== "EQUIPMENT");

export type LookingFor = "capital" | "equipment" | "capital_and_equipment";
export type LocationKey = "CA" | "US" | "OTHER";
export type PurposeKey =
  | "startup" | "media" | "working_capital" | "ar" | "inventory" | "expansion";
export type YearsKey = "0" | "<1" | "1-3" | ">3";
export type Revenue12Key = "0-150k" | "150-500k" | "500k-1m" | "1m-3m" | ">3m";
export type AvgMonthlyKey =
  | "<10k" | "10-25k" | "25-50k" | "50-100k" | "100-250k" | ">250k";
export type ArKey =
  | "none" | "0-100k" | "100-250k" | "250-500k" | "500k-1m" | "1m-3m" | ">3m";
export type FixedAssetsKey =
  | "none" | "1-50k" | "50-100k" | "100-250k" | "250-500k" | ">500k";

export type Step1Answers = {
  lookingFor?: LookingFor; capitalAmount?: number; equipmentAmount?: number;
  fundingAmount?: number; location?: LocationKey; industry?: string;
  purpose?: PurposeKey; years?: YearsKey; revenue12?: Revenue12Key;
  avgMonthly?: AvgMonthlyKey; ar?: ArKey; fixedAssets?: FixedAssetsKey;
};

const lookingForRule: Record<LookingFor, readonly Cat[]> = {
  capital: ALL_MINUS_EQUIPMENT, equipment: ["EQUIPMENT"],
  capital_and_equipment: ALL_MINUS_EQUIPMENT,
};
const locationRule: Record<LocationKey, readonly Cat[] | "BLOCK"> = {
  CA: ["LOC","TERM","EQUIPMENT","FACTORING","PO","MCA","MEDIA","ABL","STARTUP"],
  US: ALL_CATEGORIES, OTHER: "BLOCK",
};
const purposeRule: Record<PurposeKey, readonly Cat[]> = {
  startup: ["LOC","TERM","EQUIPMENT","ABL","SBA","STARTUP"],
  media: ["LOC","TERM","MEDIA"],
  working_capital: ALL_CATEGORIES.filter((c) => c !== "STARTUP"),
  ar: ["LOC","FACTORING","PO","MCA"], inventory: ["LOC","PO","MCA"],
  expansion: ALL_CATEGORIES.filter((c) => c !== "EQUIPMENT" && c !== "STARTUP" && c !== "SBA"),
};
const yearsRule: Record<YearsKey, readonly Cat[]> = {
  "0": ["SBA","STARTUP"],
  "<1": ["EQUIPMENT","FACTORING","PO","MCA","MEDIA","SBA"],
  "1-3": ALL_CATEGORIES, ">3": ALL_CATEGORIES,
};
const revenue12Rule: Record<Revenue12Key, readonly Cat[]> = {
  "0-150k": ["TERM","EQUIPMENT","MCA","MEDIA","SBA","STARTUP"],
  "150-500k": ALL_CATEGORIES, "500k-1m": ALL_CATEGORIES,
  "1m-3m": ALL_CATEGORIES, ">3m": ALL_CATEGORIES,
};
const avgMonthlyRule: Record<AvgMonthlyKey, readonly Cat[] | "BLOCK"> = {
  "<10k": "BLOCK",
  "10-25k": ["LOC","TERM","EQUIPMENT","MCA","MEDIA","ABL","SBA"],
  "25-50k": ALL_CATEGORIES, "50-100k": ALL_CATEGORIES,
  "100-250k": ALL_CATEGORIES, ">250k": ALL_CATEGORIES,
};
const arRule: Record<ArKey, readonly Cat[]> = {
  none: ["LOC","TERM","EQUIPMENT","PO","MCA","MEDIA","ABL","SBA","STARTUP"],
  "0-100k": ["LOC","TERM","EQUIPMENT","PO","MCA","MEDIA","ABL","SBA","STARTUP"],
  "100-250k": ALL_CATEGORIES, "250-500k": ALL_CATEGORIES,
  "500k-1m": ALL_CATEGORIES, "1m-3m": ALL_CATEGORIES, ">3m": ALL_CATEGORIES,
};
const fixedAssetsRule: Record<FixedAssetsKey, readonly Cat[]> = {
  none: ALL_CATEGORIES.filter((c) => c !== "ABL" && c !== "SBA"),
  "1-50k": ALL_CATEGORIES.filter((c) => c !== "ABL"),
  "50-100k": ALL_CATEGORIES, "100-250k": ALL_CATEGORIES,
  "250-500k": ALL_CATEGORIES, ">500k": ALL_CATEGORIES,
};

export type HardStop =
  | { reason: "OTHER_LOCATION"; message: string }
  | { reason: "MIN_REVENUE"; message: string };

export function detectHardStop(a: Step1Answers): HardStop | null {
  if (a.location === "OTHER") return {
    reason: "OTHER_LOCATION",
    message: "At this time we only fund corporations registered in either Canada or the United States.",
  };
  if (a.avgMonthly === "<10k") return {
    reason: "MIN_REVENUE",
    message: "Your business does not currently meet our minimum monthly revenue threshold.",
  };
  return null;
}

function intersect(a: readonly Cat[], b: readonly Cat[]): Cat[] {
  const setB = new Set(b); return a.filter((c) => setB.has(c));
}

export function computeAllowedCategories(a: Step1Answers): Cat[] {
  if (detectHardStop(a)) return [];
  let allowed: readonly Cat[] = ALL_CATEGORIES;
  const apply = (rule: readonly Cat[] | undefined) => { if (rule) allowed = intersect(allowed, rule); };
  if (a.lookingFor) apply(lookingForRule[a.lookingFor]);
  if (a.location && a.location !== "OTHER") apply(locationRule[a.location] as readonly Cat[]);
  if (a.purpose) apply(purposeRule[a.purpose]);
  if (a.years) apply(yearsRule[a.years]);
  if (a.revenue12) apply(revenue12Rule[a.revenue12]);
  if (a.avgMonthly && a.avgMonthly !== "<10k") apply(avgMonthlyRule[a.avgMonthly] as readonly Cat[]);
  if (a.ar) apply(arRule[a.ar]);
  if (a.fixedAssets) apply(fixedAssetsRule[a.fixedAssets]);
  return [...allowed];
}

export function isStartupAvailable(products: NormalizedLenderProduct[], country: "CA" | "US" | "" | null | undefined): boolean {
  if (!country) return false;
  return products.some((p: any) => {
    if (!p) return false;
    const cat = String(p.category ?? "").toUpperCase();
    if (cat !== "STARTUP" && cat !== "STARTUP_CAPITAL") return false;
    const c = String(p.country ?? "").toUpperCase();
    if (c !== country && c !== "BOTH" && c !== "") return false;
    return (p.active ?? true) === true;
  });
}

export function computeCompanion(equipmentAmount: number): { amount: number; category: "TERM" | "LOC" } {
  const amount = Math.round(equipmentAmount * 0.2);
  return { amount, category: amount <= 50_000 ? "TERM" : "LOC" };
}

export function canOfferClosingCosts(products: NormalizedLenderProduct[], equipmentAmount: number, country: "CA" | "US" | "" | null | undefined): boolean {
  const { amount, category } = computeCompanion(equipmentAmount);
  return products.some((p: any) => {
    const cat = String(p.category ?? "").toUpperCase();
    if (cat !== category && cat !== (category === "TERM" ? "TERM_LOAN" : "LINE_OF_CREDIT")) return false;
    const c = String(p.country ?? "").toUpperCase();
    if (country && c !== country && c !== "BOTH" && c !== "") return false;
    const min = Number(p.amount_min ?? p.amountMin ?? 0);
    const max = Number(p.amount_max ?? p.amountMax ?? Infinity);
    if (amount < min || amount > max) return false;
    return (p.active ?? true) === true;
  });
}

export type Leg = { category: Cat; amount: number; isCompanion?: boolean; parentCategory?: Cat };

export function buildLegs(input: {
  lookingFor: LookingFor | undefined;
  selectedCapitalCategory: Cat | undefined;
  capitalAmount: number; equipmentAmount: number; fundingAmount: number;
  closingCostsChecked: boolean;
}): Leg[] {
  const legs: Leg[] = [];
  if (input.lookingFor === "equipment") {
    legs.push({ category: "EQUIPMENT", amount: input.equipmentAmount });
    if (input.closingCostsChecked && input.equipmentAmount > 0) {
      const c = computeCompanion(input.equipmentAmount);
      legs.push({ category: c.category, amount: c.amount, isCompanion: true, parentCategory: "EQUIPMENT" });
    }
    return legs;
  }
  if (input.lookingFor === "capital_and_equipment") {
    if (input.selectedCapitalCategory) legs.push({ category: input.selectedCapitalCategory, amount: input.capitalAmount });
    legs.push({ category: "EQUIPMENT", amount: input.equipmentAmount });
    return legs;
  }
  if (input.lookingFor === "capital" && input.selectedCapitalCategory) {
    legs.push({ category: input.selectedCapitalCategory, amount: input.fundingAmount });
  }
  return legs;
}
