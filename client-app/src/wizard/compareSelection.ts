// BF_CLIENT_STEP2_COMPARE_v187
export const MAX_COMPARE = 4;

export function toggleCompare(current: string[], id: string, max = MAX_COMPARE): string[] {
  if (current.includes(id)) return current.filter((entry) => entry !== id);
  if (current.length >= max) return current;
  return [...current, id];
}

export function canAddToCompare(current: string[], id: string, max = MAX_COMPARE): boolean {
  return current.includes(id) || current.length < max;
}

export type CompareRow = { key: string; label: string; value: (product: Record<string, unknown>) => string };

function amountRange(product: Record<string, unknown>, fmt: (n: number) => string): string {
  const lo = product.amount_min;
  const hi = product.amount_max;
  const loOk = typeof lo === "number" && Number.isFinite(lo);
  const hiOk = typeof hi === "number" && Number.isFinite(hi);
  if (loOk && hiOk) return `${fmt(lo as number)} – ${fmt(hi as number)}`;
  if (loOk) return `From ${fmt(lo as number)}`;
  if (hiOk) return `Up to ${fmt(hi as number)}`;
  return "Not published";
}

function rate(product: Record<string, unknown>): string {
  const value = product.rate;
  if (value === null || value === undefined || value === "") return "Quoted on approval";
  if (typeof value === "number") return `${value}%`;
  const text = String(value).trim();
  return text.endsWith("%") ? text : `${text}%`;
}

function term(product: Record<string, unknown>): string {
  const value = product.term;
  if (value === null || value === undefined || value === "") return "Not published";
  return typeof value === "number" ? `${value} months` : String(value);
}

function documents(product: Record<string, unknown>): string {
  const docs = product.required_documents;
  if (!Array.isArray(docs) || docs.length === 0) return "None listed";
  return `${docs.length} document${docs.length === 1 ? "" : "s"}`;
}

// Deliberately no lender name: lender disclosure is a commercial decision.
export function buildCompareRows(formatAmount: (n: number) => string): CompareRow[] {
  return [
    { key: "type", label: "Product type", value: (p) => String(p.product_type ?? p.name ?? "—") },
    { key: "amount", label: "Amount range", value: (p) => amountRange(p, formatAmount) },
    { key: "term", label: "Term", value: term },
    { key: "rate", label: "Indicative rate", value: rate },
    { key: "docs", label: "Documents required", value: documents },
    { key: "country", label: "Available in", value: (p) => String(p.country ?? "—") },
  ];
}
