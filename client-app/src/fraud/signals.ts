// BF_CLIENT_v846_FRAUD - privacy-respecting device and behaviour signals for Boreal's fraud checks (ported from Keystone).
//
// What is collected, and nothing else:
//  - a random device id this app generates once and keeps in its own storage (not a hardware fingerprint)
//  - the platform (web / ios / android)
//  - how long the application took, how many fields were filled in, whether autofill was used
//  - the NAMES of sensitive fields (bank, SIN, date of birth, email, phone...) that something was pasted into
//  - a SHA-256 of a few answers (amounts, industry, address), so the server can spot identical applications
// Never keystrokes, never what was typed or pasted. Sent once, right after a successful submit, to
// POST /api/client/fraud-signals. Every function here swallows its own errors: it must never affect the application.
import { Capacitor } from "@capacitor/core";

const DEVICE_KEY = "bf_device_id";
const STATE_KEY = "bf_fraud_signals";

const SENSITIVE_TOKENS = new Set(["sin", "ssn", "dob", "birth", "birthdate", "bank", "account", "acct", "transit", "institution", "routing", "iban", "bn", "email", "phone", "mobile", "cell", "card", "password"]);

/** Is this field NAME one of the sensitive kinds? Split on _ . - and camelCase, so "business_name" is not "sin". */
export function isSensitiveField(name: string): boolean {
  const tokens = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const joined = tokens.join("");
  return tokens.some((t) => SENSITIVE_TOKENS.has(t)) || /businessnumber|dateofbirth|socialinsurance|accountnumber/.test(joined);
}

type State = { started_at: number; pasted: string[]; fields: string[]; autofill: boolean; steps: number[] };

function readState(): State | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s && typeof s.started_at === "number" ? s : null;
  } catch {
    return null;
  }
}

function writeState(s: State): void {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* storage unavailable: signals are optional */ }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** The app's own random device id (created on first use). */
export function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** A field's NAME for the signals: name, id or autocomplete attribute, reduced to letters, digits and _ . -. */
export function fieldName(el: EventTarget | null): string | null {
  if (!el || typeof (el as HTMLElement).getAttribute !== "function") return null;
  const e = el as HTMLInputElement;
  if (!/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName ?? "")) return null;
  if (e.type === "password") return "password";
  const raw = e.getAttribute("name") || e.id || e.getAttribute("autocomplete") || e.getAttribute("aria-label") || "";
  const clean = raw.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/_+/g, "_").slice(0, 40);
  return clean || null;
}

let listening = false;

/** Start counting for this application (idempotent). Called when the wizard mounts. */
export function startFraudSignals(): () => void {
  if (typeof document === "undefined") return () => undefined;
  if (!readState()) writeState({ started_at: Date.now(), pasted: [], fields: [], autofill: false, steps: [] });
  if (listening) return () => undefined;
  listening = true;
  const onPaste = (ev: Event) => {
    const name = fieldName(ev.target);
    const s = readState();
    if (!s || !name || !isSensitiveField(name) || s.pasted.includes(name)) return;
    s.pasted = [...s.pasted, name].slice(0, 30);
    writeState(s);
  };
  const onInput = (ev: Event) => {
    const name = fieldName(ev.target);
    const s = readState();
    if (!s || !name) return;
    let changed = false;
    if (!s.fields.includes(name) && s.fields.length < 300) { s.fields = [...s.fields, name]; changed = true; }
    // Browser autofill fires input events without an inputType (or as a replacement).
    const t = (ev as InputEvent).inputType;
    if (!s.autofill && (t === undefined || t === "insertReplacementText") && (ev.target as HTMLInputElement)?.tagName === "INPUT") { s.autofill = true; changed = true; }
    if (changed) writeState(s);
  };
  document.addEventListener("paste", onPaste, true);
  document.addEventListener("input", onInput, true);
  return () => {
    document.removeEventListener("paste", onPaste, true);
    document.removeEventListener("input", onInput, true);
    listening = false;
  };
}

/** Record that the applicant reached a wizard step (only the step numbers are kept). */
export function noteStep(step: number): void {
  const s = readState();
  if (!s || !Number.isFinite(step) || s.steps.includes(step)) return;
  s.steps = [...s.steps, step].slice(0, 20);
  writeState(s);
}

type AnswersApp = {
  kyc?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
  applicant?: Record<string, unknown> | null;
};

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The answers that make two applications "the same" regardless of the business name. */
export function answersForFingerprint(app: AnswersApp): string {
  const k = app.kyc ?? {}, b = app.business ?? {}, a = app.applicant ?? {};
  const parts = [
    k.fundingAmount, k.requestedAmount, k.purposeOfFunds, k.industry, k.annualRevenue, k.monthlyRevenue, k.yearsInBusiness,
    k.accountsReceivable, k.fixedAssets, b.address, b.city, b.postalCode ?? b.zip, b.phone, b.website, a.street, a.city, a.dob,
  ].map(norm);
  return parts.filter(Boolean).length >= 5 ? parts.join("|") : "";
}

export async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (!text || typeof crypto === "undefined" || !crypto.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function platform(): "web" | "ios" | "android" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

export type SignalsBody = {
  application_id: string;
  device_id: string | null;
  platform: "web" | "ios" | "android";
  answers_fingerprint: string | null;
  behaviour: { completion_seconds: number | null; fields_completed: number; pasted_fields: string[]; autofill_used: boolean; steps: number };
};

export async function buildSignals(app: AnswersApp & { applicationToken?: string | null; applicationId?: string | null }, now = Date.now()): Promise<SignalsBody | null> {
  const id = String(app.applicationToken ?? app.applicationId ?? "").trim();
  if (!id) return null;
  const s = readState();
  return {
    application_id: id,
    device_id: getDeviceId(),
    platform: platform(),
    answers_fingerprint: await sha256Hex(answersForFingerprint(app)),
    behaviour: {
      completion_seconds: s ? Math.max(0, Math.round((now - s.started_at) / 1000)) : null,
      fields_completed: s?.fields.length ?? 0,
      pasted_fields: s?.pasted ?? [],
      autofill_used: s?.autofill ?? false,
      steps: s?.steps.length ?? 0,
    },
  };
}

/** Fire-and-forget after a successful submit. Never throws, never blocks. */
export function sendFraudSignals(app: Parameters<typeof buildSignals>[0]): void {
  void (async () => {
    try {
      const body = await buildSignals(app);
      if (!body) return;
      // Same server as the submit-attempt beacon (src/utils/submitAttempt.ts).
      const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "https://server.boreal.financial";
      await fetch(`${base}/api/client/fraud-signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
        credentials: "include",
      }).catch((): undefined => undefined);
      try { sessionStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
    } catch {
      /* the fraud signals must never interfere with the application */
    }
  })();
}
