export const Validate = {
  required(value: unknown) {
    return value !== null && value !== undefined && value !== "";
  },

  number(value: unknown) {
    return !isNaN(Number(value));
  },

  positive(value: unknown) {
    return Number(value) > 0;
  },

  email(value: string) {
    return /\S+@\S+\.\S+/.test(value);
  },

  phone(value: unknown) {
    // North American Numbering Plan: 10 digits (optionally a leading 1).
    // Area code and exchange must start 2-9. Strips formatting first so
    // "(403) 555-1234", "+1 403 555 1234" and "4035551234" all validate,
    // while "1234567891" (area code 123) and other malformed numbers fail.
    const digits = String(value ?? "").replace(/\D/g, "");
    const ten =
      digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten);
  }
};
