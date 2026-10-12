// BF_CLIENT_v789_SENSITIVE_FIELDS
// Personal identifiers and personal financial figures must never be written to
// device storage. localStorage (and UserDefaults on a native build) is
// unencrypted, survives the session and ends up in device backups, so a SIN or
// date of birth typed on a shared computer would stay readable by the next
// person at the keyboard. These values live in memory only; everything that
// writes application data to storage runs it through stripSensitive() first.

/**
 * Keys that are removed wherever they appear, at any depth: government
 * identifiers, birth details and personal financial figures.
 */
export const SENSITIVE_KEYS: readonly string[] = [
  // Government identifiers (SIN / SSN / ITIN and other ID numbers).
  "sin",
  "ssn",
  "itin",
  "socialInsuranceNumber",
  "socialSecurityNumber",
  "identityNumber",
  "idNumber",
  "governmentId",
  "governmentIdNumber",
  "driversLicense",
  "driversLicenseNumber",
  "licenseNumber",
  "passportNumber",
  "alienRegistrationNumber",
  // Date and place of birth.
  "dob",
  "dateOfBirth",
  "birthDate",
  "date_of_birth",
  "placeOfBirth",
  // Personal financial figures.
  "netWorth",
  "personalNetWorth",
  "net_worth",
  "income",
  "annualIncome",
  "personalIncome",
  "householdIncome",
  "monthlyIncome",
  "mortgageBalance",
  "propertyValue",
];

/**
 * Home address keys. These are only sensitive on a person (applicant, partner,
 * owner), not on the business, so they are removed inside PERSON_CONTAINERS
 * only - the business street address is not personal information.
 */
export const HOME_ADDRESS_KEYS: readonly string[] = [
  "street",
  "address",
  "addressLine1",
  "addressLine2",
  "homeAddress",
  "homeStreet",
  "priorAddress",
  "mailingStreet",
  "mailingAddress",
];

/** Object keys whose value describes a person (or a list of people). */
export const PERSON_CONTAINERS: readonly string[] = [
  "applicant",
  "partner",
  "coApplicant",
  "additionalShareholders",
  "owners",
  "guarantors",
  "borrower",
  "kyc",
];

const sensitive = new Set(SENSITIVE_KEYS.map((k) => k.toLowerCase()));
const homeAddress = new Set(HOME_ADDRESS_KEYS.map((k) => k.toLowerCase()));
const people = new Set(PERSON_CONTAINERS.map((k) => k.toLowerCase()));

export function isSensitiveKey(key: string, insidePerson = false): boolean {
  const k = key.toLowerCase();
  return sensitive.has(k) || (insidePerson && homeAddress.has(k));
}

function strip(value: unknown, insidePerson: boolean, depth: number): unknown {
  if (depth > 12 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => strip(item, insidePerson, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key, insidePerson)) continue;
    out[key] = strip(child, insidePerson || people.has(key.toLowerCase()), depth + 1);
  }
  return out;
}

export type StripOptions = {
  /** The value itself describes a person (e.g. the Step 4 applicant draft). */
  person?: boolean;
};

/** A copy of `value` with every sensitive key removed. The input is not changed. */
export function stripSensitive<T>(value: T, options: StripOptions = {}): T {
  return strip(value, options.person === true, 0) as T;
}

/** JSON for storage: the value with sensitive keys removed. */
export function toStorableJson(value: unknown, options: StripOptions = {}): string {
  return JSON.stringify(stripSensitive(value, options));
}

/**
 * Rewrite a stored JSON entry without its sensitive keys. Used on load so data
 * written by an older build stops sitting on the device.
 */
export function purgeSensitiveFromStorage(storage: Storage | null, key: string, options: StripOptions = {}): void {
  if (!storage) return;
  try {
    const raw = storage.getItem(key);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const cleaned = JSON.stringify(stripSensitive(parsed, options));
    if (cleaned !== raw) storage.setItem(key, cleaned);
  } catch {
    // Unreadable entries cannot be cleaned, so they go.
    try { storage.removeItem(key); } catch { /* storage blocked */ }
  }
}
