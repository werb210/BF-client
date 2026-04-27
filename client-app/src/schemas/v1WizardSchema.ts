import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

// Step 1 — Financial Profile
export const step1Schema = z
  .object({
    fundingType: nonEmptyString,
    requestedAmount: z.number().positive(),
    businessLocation: nonEmptyString,
    industry: nonEmptyString,
    purposeOfFunds: nonEmptyString,
    salesHistoryYears: nonEmptyString,
    annualRevenueRange: nonEmptyString,
    avgMonthlyRevenueRange: nonEmptyString,
    accountsReceivableRange: nonEmptyString,
    fixedAssetsValueRange: nonEmptyString,
  })
  .strict();

// Step 3 — Business Details
export const step3Schema = z
  .object({
    dba: nonEmptyString,
    legalName: nonEmptyString,
    structure: nonEmptyString,
    address: nonEmptyString,
    city: nonEmptyString,
    state: nonEmptyString,
    postalCode: nonEmptyString,
    phone: nonEmptyString,
    website: z.string().url().nullable(),
    startDate: nonEmptyString,
    employeeCount: z.number().int().nonnegative(),
    estimatedRevenue: z.number().nonnegative(),
  })
  .strict();

const primaryApplicantSchema = z
  .object({
    firstName: nonEmptyString,
    lastName: nonEmptyString,
    email: z.string().email(),
    phone: nonEmptyString,
    street: nonEmptyString,
    city: nonEmptyString,
    state: nonEmptyString,
    postalCode: nonEmptyString,
    dateOfBirth: nonEmptyString,
    ssn: nonEmptyString,
    ownershipPercentage: z.number().nonnegative(),
  })
  .strict();

const partnerSchema = z
  .object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    ssn: z.string().nullable(),
    ownershipPercentage: z.number().nullable(),
  })
  .strict();

// Step 4 — Applicant Information
export const step4Schema = z
  .object({
    primary: primaryApplicantSchema,
    multipleOwners: z.boolean(),
    partner: partnerSchema,
  })
  .strict();

export type Step1Data = z.infer<typeof step1Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;

const parseCurrencyNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseIntNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const nullableString = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length === 0 ? null : normalized;
};

const nullableNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseCurrencyNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toStep1SchemaInput = (kyc: Record<string, any>): Step1Data => ({
  fundingType: String(kyc.lookingFor ?? ""),
  requestedAmount: parseCurrencyNumber(kyc.fundingAmount),
  businessLocation: String(kyc.businessLocation ?? ""),
  industry: String(kyc.industry ?? ""),
  purposeOfFunds: String(kyc.purposeOfFunds ?? ""),
  // Dual-bound fields: forms write to both canonical keys, but legacy state may
  // only have one. Validator reads whichever is populated so it matches what the
  // dropdown is actually displaying. (Block 15)
  salesHistoryYears: String(kyc.salesHistory || kyc.yearsInBusiness || ""),
  annualRevenueRange: String(kyc.revenueLast12Months || kyc.annualRevenue || ""),
  avgMonthlyRevenueRange: String(kyc.monthlyRevenue ?? ""),
  accountsReceivableRange: String(kyc.accountsReceivable || kyc.arBalance || ""),
  fixedAssetsValueRange: String(kyc.fixedAssets || kyc.availableCollateral || ""),
});

export const toStep3SchemaInput = (
  business: Record<string, any>
): Step3Data => ({
  dba: String(business.businessName ?? ""),
  legalName: String(business.legalName ?? ""),
  structure: String(business.businessStructure ?? ""),
  address: String(business.address ?? ""),
  city: String(business.city ?? ""),
  state: String(business.state ?? ""),
  postalCode: String(business.zip ?? ""),
  phone: String(business.phone ?? ""),
  website: nullableString(business.website),
  startDate: String(business.startDate ?? ""),
  employeeCount: parseIntNumber(business.employees),
  estimatedRevenue: parseCurrencyNumber(business.estimatedRevenue),
});

export const toStep4SchemaInput = (
  applicant: Record<string, any>
): Step4Data => {
  const partner = (applicant.partner as Record<string, any> | undefined) ?? {};
  return {
    primary: {
      firstName: String(applicant.firstName ?? ""),
      lastName: String(applicant.lastName ?? ""),
      email: String(applicant.email ?? ""),
      phone: String(applicant.phone ?? ""),
      street: String(applicant.street ?? ""),
      city: String(applicant.city ?? ""),
      state: String(applicant.state ?? ""),
      postalCode: String(applicant.zip ?? ""),
      dateOfBirth: String(applicant.dob ?? ""),
      ssn: String(applicant.ssn ?? ""),
      ownershipPercentage: parseCurrencyNumber(applicant.ownership),
    },
    multipleOwners: Boolean(applicant.hasMultipleOwners),
    partner: {
      firstName: nullableString(partner.firstName),
      lastName: nullableString(partner.lastName),
      email: nullableString(partner.email),
      phone: nullableString(partner.phone),
      address: nullableString(partner.street),
      city: nullableString(partner.city),
      state: nullableString(partner.state),
      postalCode: nullableString(partner.zip),
      dateOfBirth: nullableString(partner.dob),
      ssn: nullableString(partner.ssn),
      ownershipPercentage: nullableNumber(partner.ownership),
    },
  };
};

export function enforceV1StepSchema(
  step: "step1" | "step3" | "step4",
  values: Record<string, any>
) {
  const parsed =
    step === "step1"
      ? step1Schema.safeParse(toStep1SchemaInput(values))
      : step === "step3"
        ? step3Schema.safeParse(toStep3SchemaInput(values))
        : step4Schema.safeParse(toStep4SchemaInput(values));

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export const V1_CANONICAL_KEYS = {
  step1: [
    "fundingType",
    "requestedAmount",
    "businessLocation",
    "industry",
    "purposeOfFunds",
    "salesHistoryYears",
    "annualRevenueRange",
    "avgMonthlyRevenueRange",
    "accountsReceivableRange",
    "fixedAssetsValueRange",
  ] as const,
  step3: [
    "dba",
    "legalName",
    "structure",
    "address",
    "city",
    "state",
    "postalCode",
    "phone",
    "website",
    "startDate",
    "employeeCount",
    "estimatedRevenue",
  ] as const,
  step4Primary: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "postalCode",
    "dateOfBirth",
    "ssn",
    "ownershipPercentage",
  ] as const,
  step4Partner: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "postalCode",
    "dateOfBirth",
    "ssn",
    "ownershipPercentage",
  ] as const,
} as const;
