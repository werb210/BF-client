// BF_CLIENT_v805_FORMS - shared pieces for the client-portal (CMP) forms:
// a money input with a "$" adornment, the "show only the blocks in use"
// helper behind the "+ Add another ..." buttons, and save-as-you-go drafts
// kept in localStorage per form + application.
import { useCallback, useEffect, useRef, type InputHTMLAttributes } from "react";
import "./cmpForms.css";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Money field: decimal keypad on phones and a "$" in front of the value. */
export function MoneyInput({ className, ...rest }: InputProps) {
  return (
    <span className="cmpf-money">
      <input inputMode="decimal" autoComplete="off" {...rest} className={`cmpf-input${className ? ` ${className}` : ""}`} />
    </span>
  );
}

/** True when a value counts as "nothing entered". */
export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined || v === false) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.every(isBlank);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).every(isBlank);
  return false;
}

/**
 * How many blocks of a repeating list to show: at least `min`, at least as many
 * as the user has revealed, and always every block up to the last one that
 * holds data (so prefilled or saved answers never hide).
 */
export function visibleCount(blocks: unknown[], revealed: number, min = 1): number {
  let lastWithData = -1;
  blocks.forEach((b, i) => { if (!isBlank(b)) lastWithData = i; });
  return Math.min(blocks.length, Math.max(min, revealed, lastWithData + 1));
}

// ---------------------------------------------------------------------------
// Save as you go
// ---------------------------------------------------------------------------

const DRAFT_PREFIX = "bf_cmp_form_draft";

export function draftKey(form: string, applicationId: string): string {
  return `${DRAFT_PREFIX}:${form}:${applicationId}`;
}

export function readDraft<T = unknown>(form: string, applicationId: string): T | null {
  try {
    const raw = window.localStorage.getItem(draftKey(form, applicationId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(form: string, applicationId: string, value: unknown): void {
  try {
    window.localStorage.setItem(draftKey(form, applicationId), JSON.stringify(value));
  } catch {
    // storage full, blocked or private mode - the server save still runs
  }
}

export function clearDraft(form: string, applicationId: string): void {
  try {
    window.localStorage.removeItem(draftKey(form, applicationId));
  } catch {
    // ignore
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Lay the saved draft over the server copy / prefill. The draft is what the
 * user typed most recently, so it wins; the server/prefill value is used only
 * where the draft field is empty. Objects keep every key of both sides and
 * lists keep the longer length, so no block the payload carries is dropped.
 */
export function mergeDraft<T>(base: T, draft: unknown): T {
  if (draft === null || draft === undefined) return base;
  if (Array.isArray(base) && Array.isArray(draft)) {
    const len = Math.max(base.length, draft.length);
    const out: unknown[] = [];
    for (let i = 0; i < len; i++) out.push(i < base.length ? mergeDraft(base[i], draft[i]) : draft[i]);
    return out as unknown as T;
  }
  if (isPlainObject(base) && isPlainObject(draft)) {
    const out: Record<string, unknown> = { ...draft, ...base };
    for (const k of Object.keys(draft)) out[k] = k in base ? mergeDraft(base[k], draft[k]) : draft[k];
    return out as T;
  }
  if (isPlainObject(base) || Array.isArray(base)) return base;
  return isBlank(draft) ? base : (draft as T);
}

/**
 * Debounced (500ms) localStorage autosave of `value` while `enabled`. Returns
 * `clear`, called after a successful submit: it drops the saved draft and
 * stops further writes for this mount. A pending write is flushed on unmount
 * so closing the sheet right after typing does not lose the last keystrokes.
 */
export function useFormDraft(form: string, applicationId: string, value: unknown, enabled: boolean): () => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: unknown } | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled || stopped.current || !applicationId) return;
    pending.current = { value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (pending.current && !stopped.current) writeDraft(form, applicationId, pending.current.value);
      pending.current = null;
    }, 500);
  }, [form, applicationId, value, enabled]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current && !stopped.current) writeDraft(form, applicationId, pending.current.value);
    pending.current = null;
  }, [form, applicationId]);

  return useCallback(() => {
    stopped.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    clearDraft(form, applicationId);
  }, [form, applicationId]);
}
