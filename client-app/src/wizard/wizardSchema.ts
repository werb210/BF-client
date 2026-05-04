export type WizardStepKey = "step1" | "step3" | "step4";

export type WizardFieldMeta = {
  key: string;
  required?: boolean;
  autoAdvance?: boolean;
  autocomplete?: "address";
  conditional?: (context: WizardSchemaContext) => boolean;
};

export type WizardSchemaContext = {
  kyc?: Record<string, any>;
  business?: Record<string, any>;
  applicant?: Record<string, any>;
};

export const wizardSchema: Record<WizardStepKey, { fields: WizardFieldMeta[] }> = {
  step1: {
    fields: [
      { key: "lookingFor", required: true, autoAdvance: true },
      // BF_CLIENT_BLOCK_v109_EQUIPMENT_AUTOADVANCE_v1 — equipmentAmount is
      // shown when lookingFor in (EQUIPMENT, BOTH). Without it in the
      // schema, autoAdvance after that field returns undefined and the
      // wizard appears stuck on Step 1 for Equipment-only users.
      {
        key: "equipmentAmount",
        required: true,
        autoAdvance: true,
        conditional: ({ kyc }) => {
          const v = String(kyc?.lookingFor ?? "").toUpperCase();
          return v === "EQUIPMENT" || v === "BOTH";
        },
      },
      {
        key: "fundingAmount",
        required: true,
        autoAdvance: true,
        // Only required for capital flows. Equipment-only hides this input.
        conditional: ({ kyc }) => {
          const v = String(kyc?.lookingFor ?? "").toUpperCase();
          return v === "WORKING_CAPITAL" || v === "BOTH" || v === "" || v === "CAPITAL";
        },
      },
      { key: "businessLocation", required: true, autoAdvance: true },
      { key: "industry", required: true, autoAdvance: true },
      { key: "purposeOfFunds", required: true, autoAdvance: true },
      { key: "salesHistory", required: true, autoAdvance: true },
      { key: "revenueLast12Months", required: true, autoAdvance: true },
      { key: "monthlyRevenue", required: true, autoAdvance: true },
      {
        key: "accountsReceivable",
        required: true,
        autoAdvance: true,
      },
      {
        key: "fixedAssets",
        required: true,
        autoAdvance: true,
      },
    ],
  },
  step3: {
    fields: [
      { key: "businessName", required: true, autoAdvance: true },
      { key: "legalName", required: true, autoAdvance: true },
      { key: "businessStructure", required: true, autoAdvance: true },
      {
        key: "address",
        required: true,
        autoAdvance: true,
        autocomplete: "address",
      },
      { key: "city", required: true, autoAdvance: true },
      { key: "state", required: true, autoAdvance: true },
      { key: "zip", required: true, autoAdvance: true },
      { key: "phone", required: true, autoAdvance: true },
      { key: "website", required: false, autoAdvance: true },
      { key: "startDate", required: true, autoAdvance: true },
      { key: "employees", required: true, autoAdvance: true },
      { key: "estimatedRevenue", required: true, autoAdvance: true },
    ],
  },
  step4: {
    fields: [
      { key: "firstName", required: true, autoAdvance: true },
      { key: "lastName", required: true, autoAdvance: true },
      { key: "email", required: true, autoAdvance: true },
      { key: "phone", required: true, autoAdvance: true },
      {
        key: "street",
        required: true,
        autoAdvance: true,
        autocomplete: "address",
      },
      { key: "city", required: true, autoAdvance: true },
      { key: "state", required: true, autoAdvance: true },
      { key: "zip", required: true, autoAdvance: true },
      { key: "dob", required: true, autoAdvance: true },
      { key: "ssn", required: true, autoAdvance: true },
      { key: "ownership", required: true, autoAdvance: true },
      { key: "hasMultipleOwners", required: false, autoAdvance: false },
      {
        key: "partner.firstName",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.lastName",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.email",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.phone",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.street",
        required: true,
        autoAdvance: true,
        autocomplete: "address",
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.city",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.state",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.zip",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.dob",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.ssn",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
      {
        key: "partner.ownership",
        required: true,
        autoAdvance: true,
        conditional: ({ applicant }) => Boolean(applicant?.hasMultipleOwners),
      },
    ],
  },
};

export function getWizardFieldId(step: WizardStepKey, key: string) {
  return `${step}-${key}`;
}

function isValueMissing(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  return String(value).trim() === "";
}

export function getStepFieldKeys(step: WizardStepKey, context: WizardSchemaContext) {
  return wizardSchema[step].fields
    .filter((field) => (field.conditional ? field.conditional(context) : true))
    .map((field) => field.key);
}

export function getNextFieldKey(
  step: WizardStepKey,
  currentKey: string,
  context: WizardSchemaContext
) {
  const fields = getStepFieldKeys(step, context);
  const index = fields.indexOf(currentKey);
  if (index === -1) return undefined;
  return fields[index + 1];
}

export function getNextEmptyFieldKey(
  step: WizardStepKey,
  currentKey: string,
  context: WizardSchemaContext,
  values: Record<string, any>
) {
  const fields = getStepFieldKeys(step, context);
  const index = fields.indexOf(currentKey);
  if (index === -1) return undefined;
  for (let i = index + 1; i < fields.length; i += 1) {
    const key = fields[i];
    if (isValueMissing(values[key])) {
      return key;
    }
  }
  return undefined;
}
