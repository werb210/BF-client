export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.length === 10) p = '1' + p;
  if (!p.startsWith('1')) throw new Error("Invalid phone");
  return `+${p}`;
}
