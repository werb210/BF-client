export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  return value || null;
}
