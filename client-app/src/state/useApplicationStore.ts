import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getApplicationToken, clearApplicationToken } from "@/auth/applicationToken";
import { OFFLINE_CACHE_KEY, OfflineStore } from "./offline";
import type { ApplicantData, ApplicationData, BusinessData } from "../types/application";
import { clearDraft } from "../client/autosave";
import { clearSubmissionIdempotencyKey } from "../client/submissionIdempotency";
import { getSessionId, trackEvent } from "../utils/analytics";
import { emptyApplicationDraft } from "../constants/applicationDraft";
import { hasToken } from "@/api/auth";
import { purgeSensitiveFromStorage, toStorableJson } from "./sensitiveFields";
import { clearPendingSubmit, PENDING_SUBMIT_KEY } from "./pendingSubmit";

const emptyApp: ApplicationData = {
  applicationDraft: emptyApplicationDraft,
  kyc: {},
  productCategory: null,
  matchPercentages: {},
  eligibleProducts: [],
  eligibleCategories: [],
  eligibilityReasons: [],
  business: {},
  // BF_CLIENT_BLOCK_v159_OWNERSHIP_PREFILL_REAL_v1 - v158 set the default on
  // DefaultApplicantQuestions which is dead code (never imported); the live
  // wizard reads from this store. Saved values win because hydrateApplication
  // merges saved over emptyApp.
  applicant: { ownership: "100" },
  documents: {},
  productRequirements: {},
  termsAccepted: false,
  linkedApplicationTokens: [],
};

export const APPLICATION_STATE_KEY = "application_state";
export const CLIENT_BACKUP_KEY = "client_backup";
const APPLICATION_DATA_KEY = "application_data";
const BOREAL_DRAFT_KEY = "boreal_draft";
const CLIENT_DRAFT_KEY = "boreal_client_draft";

function buildApplicationDraft(source: ApplicationData): NonNullable<ApplicationData["applicationDraft"]> {
  const docs = Object.entries(source.documents || {}).map(([type, value]) => ({
    document_type: type,
    name: value?.name || type,
    status: value?.status || "missing",
    category: value?.category || type,
  }));
  const kyc = source.kyc || {};
  return {
    borrower: { ...kyc, ...(source.applicant || {}) },
    company: { ...(source.business || {}) },
    financials: {
      fundingAmount: kyc.fundingAmount,
      annualRevenue: kyc.annualRevenue || kyc.revenueLast12Months,
      monthlyRevenue: kyc.monthlyRevenue,
      accountsReceivable: kyc.accountsReceivable,
    },
    application: {
      productCategory: source.productCategory,
      selectedProductId: source.selectedProductId,
      selectedProductType: source.selectedProductType,
      currentStep: source.currentStep,
      termsAccepted: source.termsAccepted,
      signatureDate: source.signatureDate,
    },
    documents: docs,
  };
}

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function scrubPlaceholderTokens(saved: ApplicationData | null): ApplicationData | null {
  if (!saved) return saved;
  const cleaned: ApplicationData = { ...saved };
  if (saved.applicationToken && !isUuid(saved.applicationToken)) cleaned.applicationToken = null;
  if (saved.applicationId && !isUuid(saved.applicationId)) cleaned.applicationId = null;
  return cleaned;
}

function hydrateApplication(input: ApplicationData | null): ApplicationData {
  const saved = scrubPlaceholderTokens(input);
  if (!saved) return emptyApp;
  const hydrated: ApplicationData = {
    ...emptyApp,
    ...saved,
    kyc: { ...emptyApp.kyc, ...(saved.kyc || {}) },
    matchPercentages: { ...emptyApp.matchPercentages, ...(saved.matchPercentages || {}) },
    eligibleProducts: saved.eligibleProducts || [],
    eligibleCategories: saved.eligibleCategories || [],
    eligibilityReasons: saved.eligibilityReasons || [],
    business: { ...emptyApp.business, ...(saved.business || {}) },
    applicant: { ...emptyApp.applicant, ...(saved.applicant || {}) },
    documents: { ...emptyApp.documents, ...(saved.documents || {}) },
    productRequirements: { ...emptyApp.productRequirements, ...(saved.productRequirements || {}) },
    linkedApplicationTokens: saved.linkedApplicationTokens || emptyApp.linkedApplicationTokens,
  };
  return { ...hydrated, applicationDraft: saved.applicationDraft || buildApplicationDraft(hydrated) };
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadJson(key: string): ApplicationData | null {
  const store = storage();
  if (!store) return null;
  try {
    // BF_CLIENT_v789_SENSITIVE_FIELDS - data written before v789 can still hold
    // SIN/SSN, date of birth or a home address. Clean it before reading.
    purgeSensitiveFromStorage(store, key);
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as ApplicationData) : null;
  } catch {
    return null;
  }
}

function purgeLegacyKeys(): void {
  const store = storage();
  if (!store) return;
  for (const key of [APPLICATION_DATA_KEY, BOREAL_DRAFT_KEY, CLIENT_DRAFT_KEY]) {
    try { store.removeItem(key); } catch { /* storage blocked */ }
  }
}

function readBootToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getApplicationToken();
    return raw && typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

function reconcileTokens(hydrated: ApplicationData, bootToken: string | null): ApplicationData {
  if (!bootToken) return hydrated;
  if (hydrated.applicationToken === bootToken) return hydrated;
  if (!hydrated.applicationToken) return { ...hydrated, applicationToken: bootToken };
  return { ...emptyApp, applicationToken: bootToken };
}

function writeStored(key: string, value: ApplicationData): void {
  const store = storage();
  if (!store) return;
  try { store.setItem(key, toStorableJson(value)); } catch { /* kept in memory */ }
}

// BF_CLIENT_v789_SENSITIVE_FIELDS - on load, every place an older build wrote
// application data is rewritten without SIN/SSN, date of birth, home address or
// personal figures, whether or not this load ends up reading it.
function purgeStoredSensitiveData(): void {
  const store = storage();
  if (!store) return;
  for (const key of [APPLICATION_STATE_KEY, CLIENT_BACKUP_KEY, BOREAL_DRAFT_KEY, CLIENT_DRAFT_KEY, OFFLINE_CACHE_KEY, PENDING_SUBMIT_KEY]) {
    purgeSensitiveFromStorage(store, key);
  }
  try {
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i));
    for (const key of keys) {
      // Step 4's draft is the applicant record itself (client:draft:step:<scope>:4).
      if (key && key.startsWith("client:draft:")) purgeSensitiveFromStorage(store, key, { person: key.endsWith(":4") });
    }
  } catch { /* storage blocked */ }
}

function loadInitialState(): ApplicationData {
  if (typeof window === "undefined") return emptyApp;
  purgeStoredSensitiveData();
  const bootToken = readBootToken();
  const current = loadJson(APPLICATION_STATE_KEY);
  if (current) {
    purgeLegacyKeys();
    return reconcileTokens(hydrateApplication(current), bootToken);
  }
  const winner =
    loadJson(BOREAL_DRAFT_KEY) ||
    loadJson(CLIENT_DRAFT_KEY) ||
    loadJson(CLIENT_BACKUP_KEY) ||
    (OfflineStore.load() as unknown as ApplicationData | null);
  purgeLegacyKeys();
  if (winner) {
    const hydrated = reconcileTokens(hydrateApplication(winner), bootToken);
    writeStored(APPLICATION_STATE_KEY, hydrated);
    return hydrated;
  }
  if (bootToken) return { ...emptyApp, applicationToken: bootToken };
  return emptyApp;
}

let _state: ApplicationData = loadInitialState();
const _subs = new Set<() => void>();
let _trackedStep: number | undefined = _state.currentStep;
let _stepStartTime = Date.now();
let _initRan = false;
// BF_CLIENT_v789_SENSITIVE_FIELDS - set once an application is submitted, so the
// post-submit state updates do not write the application back to the device.
// Cleared when a new application starts.
let _persistSuspended = false;

// BF_CLIENT_v789_SENSITIVE_FIELDS - SIN/SSN, date of birth, home address and
// personal financial figures stay in memory (_state). Every copy written to
// storage goes through toStorableJson, which drops them.
function _persist(): void {
  if (_persistSuspended) return;
  OfflineStore.save(_state);
  writeStored(APPLICATION_STATE_KEY, _state);
  writeStored(CLIENT_BACKUP_KEY, _state);
}

function _notify(): void {
  _subs.forEach((fn) => {
    try { fn(); } catch { /* a broken subscriber must not stop the others */ }
  });
}
// BF_CLIENT_PERSIST_WIZARD_STEP_v1
// The wizard tracked its step in the store and localStorage only. Nothing ever
// told the SERVER which step an applicant reached, so applications.current_step
// and metadata.currentStep stayed at their creation value forever. Measured over
// 90 days: all 32 rows sat at step 1 - including the 5 that were fully submitted.
//
// That made the funnel unmeasurable. Every abandoned application looked like it
// died on step 1, so there was no way to tell a wizard that loses people at
// Documents from one that loses them at Business Details - and no way to know
// whether ad spend was producing real starts or bounces.
//
// The server has accepted this since v82: PATCH /api/client/applications/:id
// takes `currentStep` (1-6) and writes it through bfBuildWizardMetadata. The
// client simply never sent it.
//
// _set is the single choke point for every state change and _track already
// detects a step transition, so the PATCH goes here rather than being repeated
// in six step components where one would inevitably be missed.
//
// Fire-and-forget by design: a failed step ping must never block navigation or
// surface an error. Losing one ping costs a data point; blocking the wizard
// costs an application.
let _lastPersistedStep: number | undefined;

// BF_CLIENT_PERSIST_ANSWERS_v186
// This sent { currentStep } and nothing else. Every answer the applicant typed was
// written to localStorage by client/autosave and stayed on their device until submit.
// Measured consequence on the live database: of 60 unsubmitted applications over 90
// days, 26 carried a currentStep and only 3 carried any kyc data. Rows sitting at
// step 5 and step 6 had a completely empty kyc object - people who demonstrably
// filled ten required fields, because Step 1's Continue button will not enable
// until all ten validate.
//
// Three costs, all paid by the business:
//   - someone who leaves and returns gets a blank form and starts over
//   - staff calling an abandoned applicant cannot see what they asked for
//   - the abandoned-application nudge has nothing to personalise with
//
// The wizard payload now rides along with the step ping. Still fire-and-forget:
// a failed save must never block navigation. Losing a save costs a data point;
// blocking the wizard costs an application.
function _wizardPayload(state: ApplicationData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value && typeof value === "object" && Object.keys(value as object).length > 0) {
      out[key] = value;
    }
  };
  put("kyc", state.kyc);
  put("business", state.business);
  put("applicant", state.applicant);
  put("selected_product", state.selectedProduct);
  return out;
}

function _persistStepToServer(step: number, token: string | undefined, state?: ApplicationData): void {
  if (typeof window === "undefined") return;
  if (!token) return;                    // no application row exists yet
  if (_lastPersistedStep === step) return; // already sent, do not re-ping
  _lastPersistedStep = step;
  let payload: Record<string, unknown> = { currentStep: step };
  try {
    if (state) payload = { ...payload, ..._wizardPayload(state) };
  } catch {
    // A malformed slice must not stop the step ping - send the step alone.
    payload = { currentStep: step };
  }
  void import("../client/autosave")
    .then((m) => m.patchApplication(token, payload))
    .catch(() => {
      // Allow a later transition to retry this step if the ping failed.
      if (_lastPersistedStep === step) _lastPersistedStep = undefined;
    });
}


function _track(prev: ApplicationData, next: ApplicationData): void {
  const s = next.currentStep;
  if (!s || _trackedStep === s) return;
  if (_trackedStep !== undefined) {
    const d = Date.now() - _stepStartTime;
    const completed = _trackedStep;
    trackEvent("application_step_completed", { step: completed, time_spent_ms: d, session_id: getSessionId() });
    trackEvent("step_completed", { step: completed, time_spent_ms: d, session_id: getSessionId() });
    void import("../lib/journey").then((j) => j.trackWizardStep(completed, d)).catch(() => {}); /* BF_CLIENT_VISITOR_JOURNEY_v1 */
  }
  _trackedStep = s;
  _stepStartTime = Date.now();
  // BF_CLIENT_STEP_ENTERED_v1 - the old code only emitted a wizard_step on EXIT,
  // so someone who abandoned on step 3 was recorded as having reached step 2,
  // and anyone abandoning on step 1 was recorded as having reached nothing.
  void import("../lib/journey").then((j) => j.trackWizardStep(s)).catch(() => {});
  trackEvent("application_step_view", { step: s });
  trackEvent("client_step_progressed", { step: s });
  _persistStepToServer(s, next.applicationToken, next); /* BF_CLIENT_PERSIST_ANSWERS_v186 */
}

function _set(updater: (prev: ApplicationData) => ApplicationData): void {
  const prev = _state;
  const next = updater(prev);
  if (next === prev) return;
  _state = next;
  _persist();
  _track(prev, next);
  _notify();
}

const _subscribe = (cb: () => void) => {
  _subs.add(cb);
  return () => _subs.delete(cb);
};
const _getSnapshot = () => _state;

function withDraft(next: ApplicationData): ApplicationData {
  return { ...next, applicationDraft: buildApplicationDraft(next) };
}

export function reconcileWithBootToken(): void {
  if (typeof window === "undefined") return;
  const bootToken = readBootToken();
  if (!bootToken) return;
  if (_state.applicationToken === bootToken) return;
  if (_state.applicationToken && _state.applicationToken !== bootToken) {
    _set(() => ({ ...emptyApp, applicationToken: bootToken }));
    return;
  }
  _set((prev) => withDraft({ ...prev, applicationToken: bootToken }));
}

/* BF_CLIENT_BLOCK_v523_BROKER_IMPORT */
export function applyBrokerPrefill(token: string, part: Partial<ApplicationData>): void {
  _set(() => withDraft(hydrateApplication({ ...emptyApp, ...part, applicationToken: token })));
}

/**
 * BF_CLIENT_v789_SENSITIVE_FIELDS - after a successful submit nothing about the
 * application stays on the device: the state copies, the offline cache, every
 * step draft and the pending-submit outbox. The in-memory state is kept so the
 * confirmation screen can still read it.
 */
export function clearStoredApplication(): void {
  _persistSuspended = true;
  OfflineStore.clear();
  const store = storage();
  if (store) {
    for (const key of [APPLICATION_STATE_KEY, CLIENT_BACKUP_KEY]) {
      try { store.removeItem(key); } catch { /* storage blocked */ }
    }
    try {
      const keys = Array.from({ length: store.length }, (_, i) => store.key(i));
      for (const key of keys) {
        if (key && key.startsWith("client:draft:")) store.removeItem(key);
      }
    } catch { /* storage blocked */ }
  }
  clearDraft();
  clearPendingSubmit();
}

export function __resetSingletonForTests(): void {
  _state = loadInitialState();
  _subs.clear();
  _trackedStep = _state.currentStep;
  _stepStartTime = Date.now();
  _initRan = false;
  _persistSuspended = false;
  _lastPersistedStep = undefined; /* BF_CLIENT_PERSIST_WIZARD_STEP_v1 */
}

// BF_CLIENT_QA_FLOW_FIXES_v1 - a new application keeps identity but drops
// country-specific fields so a new app in another country does not inherit the
// prior address/phone/postal/structure/ID (e.g. a US SBA app inheriting a
// Canadian address).
const OMIT_BIZ = ["state", "province", "zip", "postalCode", "businessStructure", "phone", "businessPhone", "address", "street", "city", "businessName", "mailingZip", "mailingState", "mailingProvince", "mailingAddress"];
const OMIT_APP = ["state", "province", "zip", "postalCode", "phone", "homePhone", "workPhone", "street", "city", "ssn", "sin", "partnerState", "partnerProvince", "partnerZip"];

function stripKeys<T extends Record<string, unknown>>(source: T | undefined, keys: string[]): T {
  const copy = { ...(source || {}) } as T;
  for (const key of keys) delete copy[key];
  return copy;
}

export function useApplicationStore() {
  const app = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  const update = useCallback(
    (part: Partial<ApplicationData>) => _set((prev) => withDraft({ ...prev, ...part })),
    []
  );

  const reset = useCallback(() => {
    _persistSuspended = false;
    _set(() => emptyApp);
    OfflineStore.clear();
    const store = storage();
    try {
      store?.removeItem(APPLICATION_STATE_KEY);
      store?.removeItem(CLIENT_BACKUP_KEY);
    } catch { /* storage blocked */ }
    clearDraft();
    clearSubmissionIdempotencyKey();
    _trackedStep = undefined;
  }, []);

  // BF_CLIENT_BLOCK_v765_NEW_APP_PREFILL - a new application keeps Step 3
  // (business) + Step 4 (applicant/owners) and starts fresh on Step 1 (kyc),
  // Step 2 (product/amount) and documents. Drop the boot token + draft +
  // idempotency so the wizard mints a NEW application instead of resuming the
  // prior one; the seeded profile is persisted by _set so a refresh keeps it.
  const startNewApplication = useCallback(() => {
    _persistSuspended = false;
    _set((prev) => {
      const seeded: ApplicationData = {
        ...emptyApp,
        business: stripKeys<BusinessData>(prev.business, OMIT_BIZ),
        applicant: stripKeys<ApplicantData>(prev.applicant, OMIT_APP),
      };
      return withDraft(seeded);
    });
    try { clearApplicationToken(); } catch { /* storage blocked */ }
    clearDraft();
    clearSubmissionIdempotencyKey();
    _trackedStep = undefined;
  }, []);

  const loadFromServer = useCallback(
    (state: Partial<ApplicationData>) => _set((prev) => hydrateApplication({ ...prev, ...state })),
    []
  );

  const setToken = useCallback(
    (token: string) => _set((prev) => withDraft({ ...prev, applicationToken: token })),
    []
  );

  useEffect(() => {
    if (_initRan) return;
    _initRan = true;
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const isOtpScreen = pathname === "/otp" || pathname === "/portal";
    if (!isOtpScreen && hasToken()) {
      void import("../lender/productSync")
        .then(({ ProductSync }) => {
          try {
            ProductSync.invalidateCache();
            void ProductSync.sync().catch(() => {});
          } catch { /* product cache is best-effort */ }
        })
        .catch(() => {});
    }
  }, []);

  const init = useCallback(() => {}, []);
  return {
    app,
    initialized: true,
    init,
    update,
    reset,
    startNewApplication,
    loadFromServer,
    autosaveError: null as string | null,
    applicationToken: app.applicationToken,
    setToken,
  };
}
// BF_CLIENT_WIZARD_SHARED_STORE_v57_STORE_ANCHOR
// BF_CLIENT_WIZARD_TOKEN_RECONCILE_v58_STORE_ANCHOR
