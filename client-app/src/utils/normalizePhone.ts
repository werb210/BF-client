// BF_CLIENT_PHONE_LEADING_ONE_v4
// Ten digits beginning with "1" is NOT a North American number. No NANP area
// code starts with 0 or 1. It is what you get when someone types their country
// code and then drops a digit: "+1 423-205-619" strips to "1423205619", which
// is ten digits, so the old length check prepended ANOTHER +1 and produced
// "+11423205619". That reached Twilio, was rejected, and the user was shown a
// server error. One person hit it three times in 38 minutes and never logged in.
//
// Reject it here with a message that says what is actually wrong.
export class PhoneFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneFormatError";
  }
}

/** True when a digit string is a plausible NANP national number (NPA + NXX + 4). */
export function isPlausibleNanpNational(digits: string): boolean {
  if (digits.length !== 10) return false;
  const npa = digits.slice(0, 3);
  const nxx = digits.slice(3, 6);
  if (!/^[2-9]/.test(npa) || !/^[2-9]/.test(nxx)) return false;
  if (npa.endsWith("11") || nxx.endsWith("11")) return false;
  return true;
}

export function normalizePhone(input: string): string {
  const digits = String(input ?? "").replace(/[^\d]/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    const national = digits.slice(1);
    if (!isPlausibleNanpNational(national)) {
      throw new PhoneFormatError("That doesn't look like a valid phone number. Please check it.");
    }
    return `+${digits}`;
  }

  if (digits.length === 10) {
    if (digits.startsWith("1")) {
      throw new PhoneFormatError("That looks like it's missing a digit. Enter all 10 digits after the country code.");
    }
    if (!isPlausibleNanpNational(digits)) {
      throw new PhoneFormatError("That doesn't look like a valid phone number. Please check it.");
    }
    return `+1${digits}`;
  }

  if (digits.length > 0 && digits.length < 10) {
    throw new PhoneFormatError("That number is too short. Enter all 10 digits.");
  }

  throw new PhoneFormatError("Invalid phone number");
}
