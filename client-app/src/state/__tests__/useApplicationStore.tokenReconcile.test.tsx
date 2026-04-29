/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useApplicationStore, reconcileWithBootToken, __resetSingletonForTests } from "../useApplicationStore";
const STALE="67b6bc97-1807-4590-a5ec-6784fc7e5056"; const FRESH="30549cca-086f-4de6-a9e5-f7255a5b0029";
describe("BF_CLIENT_WIZARD_TOKEN_RECONCILE_v58",()=>{beforeEach(()=>{localStorage.clear();__resetSingletonForTests();});
it("picks up boot token when no app state",()=>{localStorage.setItem("bf_application_token",FRESH);__resetSingletonForTests();const div=document.createElement("div");const root=createRoot(div);let api:any=null;function Probe(): null {api=useApplicationStore();return null; }act(()=>{root.render(<Probe/>);});expect(api.app.applicationToken).toBe(FRESH);root.unmount();});
it("resets stale state when token differs",()=>{localStorage.setItem("application_state",JSON.stringify({applicationToken:STALE,currentStep:3,business:{companyName:"OldCorp"}}));localStorage.setItem("bf_application_token",FRESH);__resetSingletonForTests();const div=document.createElement("div");const root=createRoot(div);let api:any=null;function Probe(): null {api=useApplicationStore();return null; }act(()=>{root.render(<Probe/>);});expect(api.app.applicationToken).toBe(FRESH);expect(api.app.currentStep).toBeUndefined();root.unmount();});
it("runtime reconcile updates token",async()=>{localStorage.setItem("application_state",JSON.stringify({applicationToken:STALE,currentStep:1}));__resetSingletonForTests();const div=document.createElement("div");const root=createRoot(div);let api:any=null;function Probe(): null {api=useApplicationStore();return null; }await act(async()=>{root.render(<Probe/>);});localStorage.setItem("bf_application_token",FRESH);await act(async()=>{reconcileWithBootToken();});expect(api.app.applicationToken).toBe(FRESH);expect(api.app.currentStep).toBeUndefined();root.unmount();});});
// BF_CLIENT_WIZARD_TOKEN_RECONCILE_v58_RECONCILE_TEST_ANCHOR
