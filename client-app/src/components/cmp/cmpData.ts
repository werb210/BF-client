// BF_CLIENT_v802_PHONE_UI - shared data for the phone client portal: what each stage means for the
// client, the advisor, and Maya's side of the one chat thread.
import { apiCall } from "@/api/client";

export const STAGE_STEPS = [
  { key: "received", label: "Received", next: "We have your application. Your advisor looks at it next." },
  { key: "in_review", label: "In Review", next: "Your advisor is reviewing your file. If anything is missing, it will appear here." },
  { key: "documents_required", label: "Documents Required", next: "We need a few documents before your file can go to lenders." },
  { key: "additional_steps_required", label: "Additional Steps", next: "A few short forms are left. Once they're done, your file goes to lenders." },
  { key: "off_to_lender", label: "Off to Lender", next: "Your file is with lenders. We'll tell you the moment an offer comes in." },
  { key: "offer", label: "Offer", next: "You have an offer. Review it, then accept it or ask for changes." },
] as const;

export const FUNDED_STEP = { key: "funded", label: "Funded", next: "Your funding is complete. Thank you for choosing Boreal." };

/** "Accepted" and "Funded" are the server's funded states (BF-Server FUNDED_STATES). */
export function isFundedState(raw: unknown): boolean {
  return /^(accepted|funded)$/i.test(String(raw ?? "").trim());
}

export type Advisor = { id: string; firstName: string | null; lastName: string | null; photoUrl: string | null; bookable: boolean };

export async function loadAdvisor(applicationId: string): Promise<Advisor | null> {
  if (!applicationId) return null;
  try {
    const r = await apiCall<{ advisor?: Advisor | null }>(`/api/client/advisor?applicationId=${encodeURIComponent(applicationId)}`);
    const a = r?.advisor;
    return a && typeof a.id === "string" ? a : null;
  } catch {
    return null; // no advisor card details is not an error the client needs to see
  }
}

export function advisorName(a: Advisor | null): string {
  if (!a) return "";
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "B") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ---- Maya's side of the thread, kept on this device per application. ----
export type MayaEntry = { id: string; from: "client" | "maya"; body: string; createdAt: string; question?: string; forwarded?: boolean };
const MAYA_KEY = (applicationId: string) => "bf_cmp_maya_" + applicationId;

export function loadMayaThread(applicationId: string): MayaEntry[] {
  try {
    const raw = window.localStorage.getItem(MAYA_KEY(applicationId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((e) => e && typeof e.body === "string" && (e.from === "client" || e.from === "maya")).slice(-100) : [];
  } catch {
    return [];
  }
}

export function saveMayaThread(applicationId: string, list: MayaEntry[]): void {
  try { window.localStorage.setItem(MAYA_KEY(applicationId), JSON.stringify(list.slice(-100))); } catch { /* storage unavailable */ }
}

export const SUGGESTED_QUESTIONS = [
  "What happens next with my application?",
  "Which documents do you still need?",
  "How long until I hear from a lender?",
  "Can I change the amount I asked for?",
];

/** Who a new message goes to: the advisor if a person on staff wrote in the last 24 hours, otherwise Maya.
 *  Automatic messages carry no staff name and show as "Boreal"; they do not count. */
export function defaultRecipient(messages: Array<{ authorRole: string; authorName?: string; createdAt: string }>, now = Date.now()): "maya" | "advisor" {
  const lastStaff = [...messages].reverse().find((m) => m.authorRole === "other" && String(m.authorName ?? "Boreal").trim() !== "Boreal");
  const t = lastStaff ? Date.parse(lastStaff.createdAt) : NaN;
  return Number.isFinite(t) && now - t < 24 * 3_600_000 ? "advisor" : "maya";
}
