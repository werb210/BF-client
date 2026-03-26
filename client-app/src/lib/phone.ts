export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}
