// BF_CLIENT_v789_STEP_GUARD
// One answer to "is step N complete?", shared by the wizard's URL guard, the
// Step 5 guard and the Step 6 submit re-check. Typing /apply/step-6 into the
// address bar used to open the review screen with Steps 1-4 empty, and submit
// only checked the signature and consents, so an application could reach the
// server without a SIN, a date of birth, an address or an ownership split.
//
// Each rule mirrors the one its step already enforces on Continue:
//   Step 1 - Step1_KYC getStepErrors (Step1_KYC uses step1FieldErrors directly)
//   Step 2 - a product category was chosen (Step2_Product goNext)
//   Step 3 - Step3_Business REQUIRED_STEP3 + Accord fields + phone format
//   Step 4 - Step4_Applicant requiredFields + partner fields + ownership = 100
//   Step 5 - required Stage-1 documents present, or deferred (submission.ts)
import type { ApplicationData, ApplicantData, BusinessData, KycData, OwnerData } from "../types/application";
import { Validate } from "../utils/validate";
import { getCountryCode } from "../utils/location";
import { normalizeFundingIntent } from "../constants/wizard";
import { isMediaPathKyc, isMediaWizardPath, isSbaWizardPath, isStartupPathKyc } from "./wizardSchema";
import { isAccordLOCApp } from "./accordRisk";
import { shouldBlockForMissingDocuments } from "./submission";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STEP_NAMES: Record<WizardStep, string> = {
  1: "Financial Profile",
  2: "Product Category",
  3: "Business Details",
  4: "Applicant Information",
  5: "Documents",
  6: "Terms & Signature",
};

/** Step 1: which required answers are missing or blocking (true = problem). */
export function step1FieldErrors(kyc: KycData, countryCode: string): Record<string, boolean> {
  const values = kyc || {};
  const intent = normalizeFundingIntent(values.lookingFor);
  const capitalRequired = intent === "WORKING_CAPITAL" || intent === "BOTH";
  const equipmentRequired = intent === "EQUIPMENT" || intent === "BOTH";
  return {
    lookingFor: !Validate.required(values.lookingFor),
    fundingAmount: capitalRequired && !Validate.required(values.fundingAmount),
    equipmentAmount: equipmentRequired && !Validate.required(values.equipmentAmount),
    businessLocation: !Validate.required(values.businessLocation) || values.businessLocation === "Other",
    // BF_CLIENT_SBA_REDUCED_v191 - hidden on the SBA path, so it cannot gate Continue there.
    industry: !isStartupPathKyc(values) && !isMediaPathKyc(values) && !Validate.required(values.industry),
    // BF_CLIENT_STEP1_SPLIT_v169 - purpose is one of the five REQUIRED matching questions.
    purposeOfFunds: !Validate.required(values.purposeOfFunds),
    // BF_CLIENT_STEP1_SPLIT_v169 - the financial detail questions are OPTIONAL.
    salesHistory: false,
    revenueLast12Months: false,
    // BF_CLIENT_STEP1_CA_REVENUE_REQUIRED_v171 - in Canada avg monthly revenue is
    // required; blank OR the below-floor band both block. Optional in the US.
    monthlyRevenue:
      countryCode === "CA" && !isMediaPathKyc(values) // BF_CLIENT_MEDIA_PATH_v725
        ? !Validate.required(values.monthlyRevenue) || values.monthlyRevenue === "Under $10,000"
        : false,
    accountsReceivable: false,
    fixedAssets: false,
  };
}

const STEP1_LABELS: Record<string, string> = {
  lookingFor: "what you are looking for",
  fundingAmount: "how much funding you need",
  equipmentAmount: "the equipment amount",
  businessLocation: "your business location",
  industry: "your industry",
  purposeOfFunds: "the purpose of the funds",
  monthlyRevenue: "your average monthly revenue",
};

function missingStep1(app: ApplicationData): string[] {
  const kyc = app.kyc || {};
  const errors = step1FieldErrors(kyc, getCountryCode(kyc.businessLocation));
  return Object.entries(errors)
    .filter(([, bad]) => bad)
    .map(([key]) => STEP1_LABELS[key] ?? key);
}

function missingStep2(app: ApplicationData): string[] {
  return Validate.required(app.productCategory) || Validate.required(app.selectedProductType)
    ? []
    : ["a product category"];
}

/** Step 3 required fields, in the order the form shows them. */
export const REQUIRED_STEP3: ReadonlyArray<readonly [keyof BusinessData & string, string]> = [
  ["businessName", "business name"],
  ["businessStructure", "business structure"],
  ["address", "business address"],
  ["city", "city"],
  ["state", "province or state"],
  ["zip", "postal or ZIP code"],
  ["phone", "business phone"],
  ["startDate", "business start date"],
  ["employees", "number of employees"],
  ["estimatedRevenue", "estimated yearly revenue"],
];

// BF_CLIENT_MEDIA_PATH_v725 - employees and yearly revenue are not asked on a media file.
export const MEDIA_SKIP_STEP3 = new Set<string>(["employees", "estimatedRevenue"]);

/** BF_CLIENT_STEP3_ACCORD_v180 - the Accord LOC branch adds up to six more. */
export function missingAccordStep3Fields(business: BusinessData, isAccordLOC: boolean): string[] {
  if (!isAccordLOC) return [];
  const v = business || {};
  const out: string[] = [];
  if (!Validate.required(v.fiscalYearEnd)) out.push("fiscal year end");
  if (!Validate.required(v.inBusinessSince)) out.push("the month and year the business started");
  if (v.mailingSameAsOperating === false) {
    if (!Validate.required(v.mailingAddress)) out.push("mailing address");
    if (!Validate.required(v.mailingCity)) out.push("mailing city");
    if (!Validate.required(v.mailingState)) out.push("mailing province or state");
    if (!Validate.required(v.mailingZip)) out.push("mailing postal or ZIP code");
  }
  return out;
}

export function missingStep3Fields(app: ApplicationData): string[] {
  // BF_CLIENT_SBA_REDUCED_v191 - start-ups answer only optional identity questions.
  if (isSbaWizardPath(app)) return [];
  const values = app.business || {};
  const onMediaPath = isMediaWizardPath(app);
  return [
    ...REQUIRED_STEP3.filter(([field]) => !(onMediaPath && MEDIA_SKIP_STEP3.has(field)) && !Validate.required(values[field])).map(
      ([, label]) => label
    ),
    ...missingAccordStep3Fields(values, isAccordLOCApp(app)),
  ];
}

function missingStep3(app: ApplicationData): string[] {
  const missing = missingStep3Fields(app);
  if (missing.length === 0 && !isSbaWizardPath(app) && !Validate.phone(app.business?.phone)) {
    missing.push("a valid 10-digit business phone number");
  }
  return missing;
}

/** Step 4 required fields for the applicant and, when present, the partner. */
export const REQUIRED_OWNER_FIELDS: ReadonlyArray<readonly [keyof OwnerData & string, string]> = [
  ["firstName", "first name"],
  ["lastName", "last name"],
  ["email", "email"],
  ["phone", "phone number"],
  ["street", "street address"],
  ["city", "city"],
  ["state", "province or state"],
  ["zip", "postal or ZIP code"],
  ["dob", "date of birth"],
  ["ssn", "SIN / SSN"],
  ["ownership", "ownership %"],
];

/** BF_CLIENT_DERIVE_MULTIPLE_OWNERS_v150 - owning less than all of it is having other owners. */
export function impliesMultipleOwners(applicant: ApplicantData | undefined): boolean {
  const pct = Number(applicant?.ownership ?? 0);
  return Number.isFinite(pct) && pct > 0 && pct < 100;
}

export function ownershipValidity(applicant: ApplicantData | undefined) {
  const values = applicant || {};
  const partner = values.partner || {};
  const primary = Number(values.ownership || 0);
  const second = Number(partner.ownership || 0);
  const multi = impliesMultipleOwners(values);
  const ownershipRangeValid = primary >= 1 && primary <= 100 && (!multi || (second >= 1 && second <= 100));
  const ownershipTotalValid = multi ? primary + second === 100 : primary === 100;
  return { ownershipRangeValid, ownershipTotalValid, ownershipValid: ownershipRangeValid && ownershipTotalValid };
}

function missingStep4(app: ApplicationData): string[] {
  const values = app.applicant || {};
  const out = REQUIRED_OWNER_FIELDS.filter(([field]) => !Validate.required(values[field])).map(([, label]) => label);
  if (impliesMultipleOwners(values)) {
    const partner = values.partner || {};
    for (const [field, label] of REQUIRED_OWNER_FIELDS) {
      if (!Validate.required(partner[field])) out.push(`partner ${label}`);
    }
  }
  const { ownershipValid } = ownershipValidity(values);
  if (!ownershipValid && Validate.required(values.ownership)) {
    out.push("ownership adding up to 100% across every owner");
  }
  return out;
}

function missingStep5(app: ApplicationData): string[] {
  // SBA files collect every document in Stage 2 (BF_CLIENT_SBA_SKIP_DOCS_v192).
  if (isSbaWizardPath(app)) return [];
  return shouldBlockForMissingDocuments(app) ? ["required documents (or choose to supply them later)"] : [];
}

const CHECKS: Record<Exclude<WizardStep, 6>, (app: ApplicationData) => string[]> = {
  1: missingStep1,
  2: missingStep2,
  3: missingStep3,
  4: missingStep4,
  5: missingStep5,
};

/** What is missing on one step; empty when the step is complete. */
export function missingForStep(app: ApplicationData, step: Exclude<WizardStep, 6>): string[] {
  try {
    return CHECKS[step](app);
  } catch {
    return ["required answers"];
  }
}

export function isStepComplete(app: ApplicationData, step: Exclude<WizardStep, 6>): boolean {
  return missingForStep(app, step).length === 0;
}

/**
 * The first step before `target` that is not complete, or null when every
 * earlier step passes. Used to refuse a deep link past an unfinished step.
 */
export function firstIncompleteStepBefore(app: ApplicationData, target: number, lastStep: number = 5): WizardStep | null {
  const end = Math.min(target - 1, lastStep);
  for (let step = 1; step <= end; step += 1) {
    if (!isStepComplete(app, step as Exclude<WizardStep, 6>)) return step as WizardStep;
  }
  return null;
}

export type StepIssue = { step: WizardStep; name: string; missing: string[] };

/** Every incomplete step among 1-4, for the Step 6 submit re-check. */
export function incompleteStepsForSubmit(app: ApplicationData): StepIssue[] {
  const issues: StepIssue[] = [];
  for (const step of [1, 2, 3, 4] as const) {
    const missing = missingForStep(app, step);
    if (missing.length > 0) issues.push({ step, name: STEP_NAMES[step], missing });
  }
  return issues;
}

/** One readable sentence naming the first incomplete step and what it needs. */
export function describeIncompleteStep(issue: StepIssue): string {
  const list = issue.missing.slice(0, 4).join(", ");
  const more = issue.missing.length > 4 ? `, and ${issue.missing.length - 4} more` : "";
  return `Step ${issue.step} (${issue.name}) is incomplete: please add ${list}${more}.`;
}
