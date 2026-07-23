// @ts-nocheck
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { OfflineStore } from "./offline";
import { ApplicationData } from "../types/application";
import { clearDraft } from "../client/autosave";
import { clearSubmissionIdempotencyKey } from "../client/submissionIdempotency";
import { getSessionId, trackEvent } from "../utils/analytics";
import { emptyApplicationDraft } from "../constants/applicationDraft";
import { hasToken } from "@/api/auth";

const emptyApp: ApplicationData = { applicationDraft: emptyApplicationDraft, kyc: {}, productCategory: null, matchPercentages: {}, eligibleProducts: [], eligibleCategories: [], eligibilityReasons: [], business: {}, /* BF_CLIENT_BLOCK_v159_OWNERSHIP_PREFILL_REAL_v1 — v158 set the default on DefaultApplicantQuestions which is dead code (never imported); the live wizard reads from this store. Saved values win because hydrateApplication merges saved over emptyApp. */ applicant: { ownership: "100" }, documents: {}, productRequirements: {}, termsAccepted: false, linkedApplicationTokens: [] };
const APPLICATION_STATE_KEY = "application_state";
const APPLICATION_DATA_KEY = "application_data";
const BOREAL_DRAFT_KEY = "boreal_draft";
const CLIENT_DRAFT_KEY = "boreal_client_draft";
const CLIENT_BACKUP_KEY = "client_backup";

function buildApplicationDraft(source: ApplicationData) { const docs = Object.entries(source.documents || {}).map(([type, value]) => ({ document_type: type, name: value?.name || type, status: value?.status || "missing", category: value?.category || type })); return { borrower: { ...((source.kyc as Record<string, unknown>) || {}), ...((source.applicant as Record<string, unknown>) || {}) }, company: { ...((source.business as Record<string, unknown>) || {}) }, financials: { fundingAmount: (source.kyc as Record<string, unknown>)?.fundingAmount, annualRevenue: (source.kyc as Record<string, unknown>)?.annualRevenue || (source.kyc as Record<string, unknown>)?.revenueLast12Months, monthlyRevenue: (source.kyc as Record<string, unknown>)?.monthlyRevenue, accountsReceivable: (source.kyc as Record<string, unknown>)?.accountsReceivable }, application: { productCategory: source.productCategory, selectedProductId: source.selectedProductId, selectedProductType: source.selectedProductType, currentStep: source.currentStep, termsAccepted: source.termsAccepted, signatureDate: source.signatureDate }, documents: docs }; }
const isUuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function scrubPlaceholderTokens(saved: ApplicationData | null){ if(!saved) return saved; const cleaned={...saved} as ApplicationData; if((saved as any).applicationToken&&!isUuid((saved as any).applicationToken))(cleaned as any).applicationToken=null; if((saved as any).applicationId&&!isUuid((saved as any).applicationId))(cleaned as any).applicationId=null; return cleaned; }
function hydrateApplication(saved: ApplicationData | null): ApplicationData { saved=scrubPlaceholderTokens(saved); if(!saved) return emptyApp; const hydrated={...emptyApp,...saved,kyc:{...emptyApp.kyc,...(saved.kyc||{})},matchPercentages:{...emptyApp.matchPercentages,...(saved.matchPercentages||{})},eligibleProducts:saved.eligibleProducts||[],eligibleCategories:saved.eligibleCategories||[],eligibilityReasons:saved.eligibilityReasons||[],business:{...emptyApp.business,...(saved.business||{})},applicant:{...emptyApp.applicant,...(saved.applicant||{})},documents:{...emptyApp.documents,...(saved.documents||{})},productRequirements:{...emptyApp.productRequirements,...(saved.productRequirements||{})},linkedApplicationTokens:saved.linkedApplicationTokens||emptyApp.linkedApplicationTokens}; return {...hydrated,applicationDraft:saved.applicationDraft||buildApplicationDraft(hydrated as ApplicationData)} as ApplicationData; }
const loadJson=(k:string)=>{ if(typeof window==="undefined") return null; try{const r=localStorage.getItem(k); return r?JSON.parse(r):null;}catch{return null;} };
function purgeLegacyKeys(){ if(typeof window==="undefined") return; [APPLICATION_DATA_KEY,BOREAL_DRAFT_KEY,CLIENT_DRAFT_KEY].forEach(k=>{try{localStorage.removeItem(k);}catch{}}); }
function readBootToken(): string | null { if(typeof window==="undefined") return null; try{const raw=localStorage.getItem("bf_application_token"); return raw&&typeof raw==="string"?raw:null;}catch{return null;} }
function reconcileTokens(hydrated: ApplicationData, bootToken: string | null): ApplicationData { if(!bootToken) return hydrated; if(hydrated.applicationToken===bootToken) return hydrated; if(!hydrated.applicationToken){ return {...hydrated,applicationToken:bootToken} as ApplicationData; } return {...emptyApp,applicationToken:bootToken} as ApplicationData; }
function loadInitialState(): ApplicationData { if(typeof window==="undefined") return emptyApp; const bootToken=readBootToken(); const c=loadJson(APPLICATION_STATE_KEY); if(c){purgeLegacyKeys(); return reconcileTokens(hydrateApplication(c),bootToken);} const winner=loadJson(BOREAL_DRAFT_KEY)||loadJson(CLIENT_DRAFT_KEY)||loadJson(CLIENT_BACKUP_KEY)||(OfflineStore.load() as ApplicationData|null); purgeLegacyKeys(); if(winner){const h=reconcileTokens(hydrateApplication(winner),bootToken); try{localStorage.setItem(APPLICATION_STATE_KEY,JSON.stringify(h));}catch{} return h;} if(bootToken){ return {...emptyApp,applicationToken:bootToken} as ApplicationData; } return emptyApp; }
let _state: ApplicationData = loadInitialState(); const _subs=new Set<()=>void>(); let _trackedStep:number|undefined=_state.currentStep; let _stepStartTime=Date.now(); let _initRan=false;
function _persist(){ if(typeof window==="undefined") return; try{const j=JSON.stringify(_state); localStorage.setItem(APPLICATION_STATE_KEY,j); localStorage.setItem(CLIENT_BACKUP_KEY,j);}catch{} }
function _notify(){ _subs.forEach(fn=>{try{fn();}catch{}}); }
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

function _persistStepToServer(step: number, token: string | undefined): void {
  if (typeof window === "undefined") return;
  if (!token) return;                    // no application row exists yet
  if (_lastPersistedStep === step) return; // already sent, do not re-ping
  _lastPersistedStep = step;
  void import("../client/autosave")
    .then((m) => m.patchApplication(token, { currentStep: step }))
    .catch(() => {
      // Allow a later transition to retry this step if the ping failed.
      if (_lastPersistedStep === step) _lastPersistedStep = undefined;
    });
}

function _track(prev:ApplicationData,next:ApplicationData){ const s=next.currentStep; if(!s||_trackedStep===s) return; if(_trackedStep!==undefined){const d=Date.now()-_stepStartTime; trackEvent("application_step_completed",{step:_trackedStep,time_spent_ms:d,session_id:getSessionId()}); trackEvent("step_completed",{step:_trackedStep,time_spent_ms:d,session_id:getSessionId()}); void import("../lib/journey").then((j)=>j.trackWizardStep(_trackedStep as number,d)).catch(()=>{});} /* BF_CLIENT_VISITOR_JOURNEY_v1 */ _trackedStep=s; _stepStartTime=Date.now(); trackEvent("application_step_view",{step:s}); trackEvent("client_step_progressed",{step:s}); _persistStepToServer(s, next.applicationToken); }
function _set(updater:(prev:ApplicationData)=>ApplicationData){ const prev=_state; const next=updater(prev); if(next===prev) return; _state=next; OfflineStore.save(next); _persist(); _track(prev,next); _notify(); }
const _subscribe=(cb:()=>void)=>{ _subs.add(cb); return ()=>_subs.delete(cb);}; const _getSnapshot=()=>_state;
export function reconcileWithBootToken(): void { if(typeof window==="undefined") return; const bootToken=readBootToken(); if(!bootToken) return; if(_state.applicationToken===bootToken) return; if(_state.applicationToken&&_state.applicationToken!==bootToken){ _set(()=>({...emptyApp,applicationToken:bootToken} as ApplicationData)); return; } _set((prev)=>{const n={...prev,applicationToken:bootToken} as ApplicationData; return {...n,applicationDraft:buildApplicationDraft(n)};}); }
export function __resetSingletonForTests(){ _state=loadInitialState(); _subs.clear(); _trackedStep=_state.currentStep; _stepStartTime=Date.now(); _initRan=false; _lastPersistedStep=undefined; /* BF_CLIENT_PERSIST_WIZARD_STEP_v1 */ }
export function useApplicationStore(){ const app=useSyncExternalStore(_subscribe,_getSnapshot,_getSnapshot); const update=useCallback((part:Partial<ApplicationData>)=>_set(prev=>{const n={...prev,...part} as ApplicationData; return {...n,applicationDraft:buildApplicationDraft(n)};}),[]); const reset=useCallback(()=>{_set(()=>emptyApp); OfflineStore.clear(); try{localStorage.removeItem(APPLICATION_STATE_KEY);localStorage.removeItem(CLIENT_BACKUP_KEY);}catch{} clearDraft(); clearSubmissionIdempotencyKey(); _trackedStep=undefined;},[]); const startNewApplication=useCallback(()=>{/* BF_CLIENT_BLOCK_v765_NEW_APP_PREFILL — a new application keeps Step 3 (business) + Step 4 (applicant/owners) and starts fresh on Step 1 (kyc), Step 2 (product/amount) and documents. Drop the boot token + draft + idempotency so the wizard mints a NEW application instead of resuming the prior one; the seeded profile is persisted by _set so a refresh keeps it. */ _set((prev)=>{const seeded={...emptyApp,business:prev.business,applicant:prev.applicant} as ApplicationData; return {...seeded,applicationDraft:buildApplicationDraft(seeded)};}); try{localStorage.removeItem("bf_application_token");}catch{} clearDraft(); clearSubmissionIdempotencyKey(); _trackedStep=undefined;},[]); const loadFromServer=useCallback((state:Partial<ApplicationData>)=>_set(prev=>hydrateApplication({...prev,...state} as ApplicationData)),[]); const setToken=useCallback((token:string)=>_set(prev=>{const n={...prev,applicationToken:token} as ApplicationData; return {...n,applicationDraft:buildApplicationDraft(n)};}),[]);
useEffect(()=>{ if(_initRan) return; _initRan=true; const pathname=typeof window!=="undefined"?window.location.pathname:""; const isOtpScreen=pathname==="/otp"||pathname==="/portal"; if(!isOtpScreen&&hasToken()){ void import("../lender/productSync").then(({ProductSync})=>{ try{ProductSync.invalidateCache(); void ProductSync.sync().catch(()=>{});}catch{}}).catch(()=>{});} },[]);
const init=useCallback(()=>{},[]); return {app,initialized:true,init,update,reset,startNewApplication,loadFromServer,autosaveError:null as string|null,applicationToken:app.applicationToken,setToken}; }
// BF_CLIENT_WIZARD_SHARED_STORE_v57_STORE_ANCHOR
// BF_CLIENT_WIZARD_TOKEN_RECONCILE_v58_STORE_ANCHOR
