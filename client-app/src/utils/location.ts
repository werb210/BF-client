export type BusinessLocation = "Canada" | "United States" | "Other" | string;

export function getCountryCode(location?: BusinessLocation) {
  if (location === "Canada") return "CA";
  if (location === "United States") return "US";
  // BF_CLIENT_BLOCK_v85_STEP2_PRODUCTS_VISIBLE_v1
  // Default unknown business locations to empty string, NOT "US".
  // Downstream matchesCountry() treats an empty applicant country as
  // "match anything", which is the correct behavior when location
  // hasn't loaded yet. Returning "US" silently mis-filtered every CA
  // product whenever businessLocation hadn't been set to "Canada".
  return "";
}

export function getRegionLabel(countryCode: string) {
  return countryCode === "CA" ? "Province" : "State";
}

export function getPostalLabel(countryCode: string) {
  return countryCode === "CA" ? "Postal Code" : "ZIP Code";
}

export function getIdentityLabel(countryCode: string) {
  return countryCode === "CA" ? "SIN" : "SSN";
}

export function sanitizeCurrencyInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

export function formatCurrencyValue(value: string, countryCode: string) {
  const cleaned = sanitizeCurrencyInput(value);
  if (!cleaned) return "";
  const amount = Number.parseFloat(cleaned);
  if (Number.isNaN(amount)) return "";
  const locale = countryCode === "CA" ? "en-CA" : "en-US";
  const currency = countryCode === "CA" ? "CAD" : "USD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPostalCode(value: string, countryCode: string) {
  const cleaned = value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  if (countryCode === "CA") {
    const trimmed = cleaned.slice(0, 6);
    if (trimmed.length <= 3) return trimmed;
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
  }

  const digits = cleaned.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatIdentityNumber(value: string, countryCode: string) {
  const digits = value.replace(/\D/g, "");
  if (countryCode === "CA") {
    const trimmed = digits.slice(0, 9);
    if (trimmed.length <= 3) return trimmed;
    if (trimmed.length <= 6) {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    }
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 6)}-${trimmed.slice(6)}`;
  }

  const trimmed = digits.slice(0, 9);
  if (trimmed.length <= 3) return trimmed;
  if (trimmed.length <= 5) {
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
  }
  return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 5)}-${trimmed.slice(5)}`;
}

export function formatPhoneNumber(value: string, countryCode: string) {
  const digits = value.replace(/\D/g, "");
  if (countryCode === "CA" || countryCode === "US") {
    const trimmed = digits.slice(0, 10);
    if (trimmed.length <= 3) return trimmed;
    if (trimmed.length <= 6) {
      return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3)}`;
    }
    return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(
      6
    )}`;
  }

  return digits.slice(0, 15);
}


export function formatCurrencyOnInput(value: string, countryCode: string): string {
  const cleaned = sanitizeCurrencyInput(value);
  if (!cleaned) return "";
  const [intPart, decPart] = cleaned.split(".");
  if (intPart === "" && decPart === undefined) return "";
  const locale = countryCode === "CA" ? "en-CA" : "en-US";
  const intNum = Number.parseInt(intPart || "0", 10);
  if (Number.isNaN(intNum)) return cleaned;
  const groupedInt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(intNum);
  if (decPart === undefined) return groupedInt;
  return groupedInt + "." + decPart.slice(0, 2);
}
