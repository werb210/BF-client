// BF_CLIENT_BEHAVIOUR_v707
// Records interaction labels and field names only; applicant-entered values are never read.
import { trackJourney } from "@/lib/journey";

let lastField = "";
let lastFieldStep = "";
const completed = new Set<string>();

export function wizardStepFromPath(pathname: string): string {
  const m = /\/apply\/step-(\d)/.exec(pathname || "");
  return m ? m[1] : "";
}

function clean(text: string | null | undefined, max = 80): string {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function currentStep(): string {
  return typeof window === "undefined" ? "" : wizardStepFromPath(window.location.pathname);
}

function fieldName(el: Element): string {
  return clean(el.getAttribute("name") || el.id || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "field", 60);
}

function send(type: string, step: string, meta: Record<string, unknown>): void {
  try {
    trackJourney({ type, step: step || undefined, path: window.location.pathname, meta });
  } catch { /* never break the app */ }
}

function onClick(event: MouseEvent): void {
  const el = (event.target as Element | null)?.closest?.("a, button, [role='button']");
  if (!el) return;
  const label = clean(el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.textContent);
  if (label) send("click", currentStep(), { label });
}

function onFocus(event: FocusEvent): void {
  const el = event.target as Element | null;
  if (!el?.matches?.("input, select, textarea")) return;
  lastField = fieldName(el);
  lastFieldStep = currentStep();
}

function onChange(event: Event): void {
  const el = event.target as Element | null;
  if (!el?.matches?.("input, select, textarea")) return;
  const step = currentStep();
  const name = fieldName(el);
  lastField = name;
  lastFieldStep = step;
  const key = step + ":" + name;
  if (completed.has(key)) return;
  completed.add(key);
  send("field_complete", step, { field: name });
}

export function recordFieldAbandon(reason: string): void {
  if (!lastField || !lastFieldStep) return;
  send("field_abandon", lastFieldStep, { field: lastField, reason });
  lastField = "";
  lastFieldStep = "";
}

export function clientBehaviourRoute(pathname: string): void {
  if (lastFieldStep && wizardStepFromPath(pathname) === "") recordFieldAbandon("left_wizard");
  else if (wizardStepFromPath(pathname) !== lastFieldStep) { lastField = ""; lastFieldStep = ""; }
}

export function initClientBehaviour(): void {
  try {
    if (typeof window === "undefined") return;
    document.addEventListener("click", onClick, { capture: true, passive: true });
    document.addEventListener("focusin", onFocus, { capture: true });
    document.addEventListener("change", onChange, { capture: true });
    window.addEventListener("pagehide", () => recordFieldAbandon("closed"));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") recordFieldAbandon("hidden"); });
  } catch { /* never break the app */ }
}
