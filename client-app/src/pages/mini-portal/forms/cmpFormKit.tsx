// BF_CLIENT_v805_FORMS - shared pieces for the client-portal (CMP) forms:
// (BF_CLIENT_v807_FORMS adds the Canada / US address block at the bottom.)
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

// ---------------------------------------------------------------------------
// BF_CLIENT_v807_FORMS - postal address block for Canada and the United States
// ---------------------------------------------------------------------------

export type AddressCountry = "" | "CA" | "US";
export type AddressValue = { street: string; city: string; region: string; postal: string; country: string };
export type AddressPart = keyof AddressValue;

export const EMPTY_ADDRESS: AddressValue = { street: "", city: "", region: "", postal: "", country: "" };
export const ADDRESS_PARTS: AddressPart[] = ["street", "city", "region", "postal", "country"];

export const COUNTRY_NAMES: Record<"CA" | "US", string> = { CA: "Canada", US: "United States" };

export const CA_PROVINCES: Array<[string, string]> = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

export const US_STATES: Array<[string, string]> = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const CA_CODES = new Set(CA_PROVINCES.map(([c]) => c));
const US_CODES = new Set(US_STATES.map(([c]) => c));

/** "Canada" / "canada" / "CA" -> "CA"; "United States" / "USA" / "US" -> "US"; anything else "". */
export function normalizeCountry(raw: unknown): AddressCountry {
  const v = String(raw ?? "").trim().toLowerCase().replace(/\./g, "");
  if (["ca", "can", "canada"].includes(v)) return "CA";
  if (["us", "usa", "united states", "united states of america", "america"].includes(v)) return "US";
  return "";
}

/**
 * A province/state code from a code or a full name. "CA" alone is California
 * (a region, not the country). Unknown text gives "".
 */
export function normalizeRegion(raw: unknown): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  const up = v.toUpperCase();
  if (CA_CODES.has(up) || US_CODES.has(up)) return up;
  const low = v.toLowerCase();
  const hit = [...CA_PROVINCES, ...US_STATES].find(([, name]) => name.toLowerCase() === low);
  if (hit) return hit[0];
  if (low === "québec") return "QC";
  return "";
}

/** The country a province/state code belongs to. */
export function countryOfRegion(region: string, preferred: string = ""): AddressCountry {
  const inCa = CA_CODES.has(region);
  const inUs = US_CODES.has(region);
  if (inCa && inUs) return preferred === "US" ? "US" : "CA";
  if (inCa) return "CA";
  if (inUs) return "US";
  return "";
}

/** One-line address: "123 Main St, Calgary, AB T2P 1A1, Canada". */
export function formatAddressLine(v: AddressValue): string {
  const country = v.country === "CA" || v.country === "US" ? COUNTRY_NAMES[v.country] : v.country.trim();
  const regionPostal = [v.region.trim(), v.postal.trim()].filter(Boolean).join(" ");
  return [v.street.trim(), v.city.trim(), regionPostal, country].filter(Boolean).join(", ");
}

/** Uppercase a Canadian postal code and put the space in ("t2p1a1" -> "T2P 1A1"). */
export function formatPostal(raw: string, country: string): string {
  if (country === "US") return raw;
  const up = raw.toUpperCase();
  const compact = up.replace(/\s+/g, "");
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  return up;
}

/**
 * One edit to an address. Picking a province/state sets the country; changing
 * the country drops a province/state that does not belong to it; Canadian
 * postal codes are uppercased.
 */
export function applyAddressChange(current: AddressValue, part: AddressPart, value: string): AddressValue {
  const next: AddressValue = { ...current, [part]: value };
  if (part === "region" && value) {
    const c = countryOfRegion(value, current.country);
    if (c) next.country = c;
  }
  if (part === "country" && next.region) {
    const fits = value === "CA" ? CA_CODES.has(next.region) : value === "US" ? US_CODES.has(next.region) : true;
    if (!fits) next.region = "";
  }
  if (part === "postal" || part === "country") next.postal = formatPostal(next.postal, next.country);
  return next;
}

/** The keys an address is stored under in a flat record: `<field>_street` etc. */
export function addressKeys(field: string): Record<AddressPart, string> {
  return {
    street: `${field}_street`, city: `${field}_city`, region: `${field}_region`,
    postal: `${field}_postal`, country: `${field}_country`,
  };
}

/**
 * Read an address from a flat record. When none of the part keys hold data
 * but the old one-line `field` does (saved before v807), the whole line goes
 * in Street so nothing is lost.
 */
export function readAddress(rec: Record<string, unknown> | undefined, field: string): AddressValue {
  const r = rec ?? {};
  const keys = addressKeys(field);
  const out = { ...EMPTY_ADDRESS };
  for (const p of ADDRESS_PARTS) out[p] = String(r[keys[p]] ?? "");
  out.country = normalizeCountry(out.country) || out.country;
  if (ADDRESS_PARTS.every((p) => out[p].trim() === "")) out.street = String(r[field] ?? "");
  return out;
}

/** The record entries for an address: the parts plus the one-line `field`. */
export function addressEntries(field: string, v: AddressValue): Record<string, string> {
  const keys = addressKeys(field);
  const out: Record<string, string> = { [field]: formatAddressLine(v) };
  for (const p of ADDRESS_PARTS) out[keys[p]] = v[p];
  return out;
}

/** True when the record already holds any part key for `field`. */
export function hasAddressParts(rec: Record<string, unknown> | undefined, field: string): boolean {
  const keys = addressKeys(field);
  return ADDRESS_PARTS.some((p) => String(rec?.[keys[p]] ?? "").trim() !== "");
}

/** Address parts from the canonical CMP prefill (street, city, province, postal). */
export function addressFromPrefill(prefill: Record<string, unknown> | undefined): AddressValue {
  const p = prefill ?? {};
  const region = normalizeRegion(p.province ?? p.state);
  const country = normalizeCountry(p.country) || countryOfRegion(region);
  return {
    street: String(p.street ?? ""),
    city: String(p.city ?? ""),
    region,
    postal: formatPostal(String(p.postal ?? p.zip ?? ""), country),
    country,
  };
}

export type AddressBlockProps = {
  /** Unique id prefix for the inputs. */
  idPrefix: string;
  /** Group heading shown above the fields, e.g. "Full home address". */
  legend?: string;
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  onBlur?: () => void;
  testId?: string;
};

/**
 * Street, City, State/Province, ZIP/Postal code and Country. Both the Canadian
 * and US lists are always offered; the chosen country's list comes first.
 */
export function AddressBlock({ idPrefix, legend, value, onChange, onBlur, testId }: AddressBlockProps) {
  const country = value.country === "CA" || value.country === "US" ? value.country : "";
  // BF_CLIENT_v817 - a chosen country used to narrow the list: once "United States" was set (by the prefill or
  // a stray pick) Canadian clients could no longer find their province. Both lists are always offered, the chosen
  // country first, and picking a province or state still sets the country.
  const regionLabel = "State / Province";
  const postalLabel = "ZIP / Postal code";
  const set = (part: AddressPart) => (e: { target: { value: string } }) => onChange(applyAddressChange(value, part, e.target.value));
  const id = (p: string) => `${idPrefix}-${p}`;
  // A saved region that is not in the lists (free text from older data) stays selectable.
  const knownRegion = !value.region || CA_CODES.has(value.region) || US_CODES.has(value.region);
  const group = (label: string, list: Array<[string, string]>) => (
    <optgroup label={label}>
      {list.map(([code, name]) => <option key={`${label}-${code}`} value={code}>{name}</option>)}
    </optgroup>
  );
  return (
    <fieldset className="cmpf-address" data-testid={testId}>
      {legend && <legend className="cmpf-label cmpf-address-legend">{legend}</legend>}
      <div className="cmpf-address-street">
        <label className="cmpf-label" htmlFor={id("street")}>Street</label>
        <input id={id("street")} className="cmpf-input" autoComplete="address-line1" value={value.street} onChange={set("street")} onBlur={onBlur} />
      </div>
      <div className="cmpf-address-row">
        <div>
          <label className="cmpf-label" htmlFor={id("city")}>City</label>
          <input id={id("city")} className="cmpf-input" autoComplete="address-level2" value={value.city} onChange={set("city")} onBlur={onBlur} />
        </div>
        <div>
          <label className="cmpf-label" htmlFor={id("region")}>{regionLabel}</label>
          <select id={id("region")} className="cmpf-select" autoComplete="address-level1" value={value.region} onChange={set("region")} onBlur={onBlur}>
            <option value="">Select...</option>
            {!knownRegion && <option value={value.region}>{value.region}</option>}
            {country === "US" ? group("United States", US_STATES) : group("Canada", CA_PROVINCES)}
            {country === "US" ? group("Canada", CA_PROVINCES) : group("United States", US_STATES)}
          </select>
        </div>
      </div>
      <div className="cmpf-address-row">
        <div>
          <label className="cmpf-label" htmlFor={id("postal")}>{postalLabel}</label>
          <input id={id("postal")} className="cmpf-input" inputMode="text" autoComplete="postal-code" autoCapitalize="characters" value={value.postal} onChange={set("postal")} onBlur={onBlur} />
        </div>
        <div>
          <label className="cmpf-label" htmlFor={id("country")}>Country</label>
          <select id={id("country")} className="cmpf-select" autoComplete="country" value={country} onChange={set("country")} onBlur={onBlur}>
            <option value="">Select...</option>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </div>
      </div>
    </fieldset>
  );
}
