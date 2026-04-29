/* @vitest-environment jsdom */
import { describe,it,expect,beforeEach } from "vitest";
import React from "react"; import { createRoot } from "react-dom/client"; import { act } from "react";
import { useApplicationStore, __resetSingletonForTests } from "../useApplicationStore";
describe("shadow",()=>{beforeEach(()=>{localStorage.clear();__resetSingletonForTests();});it("canonical wins",async()=>{localStorage.setItem('application_data',JSON.stringify({currentStep:2})); localStorage.setItem('application_state',JSON.stringify({currentStep:5})); __resetSingletonForTests(); let api:any; const P=(): null => {api=useApplicationStore();return null}; const r=createRoot(document.createElement('div')); await act(async()=>{r.render(<P/>)}); expect(api.app.currentStep).toBe(5);});});
// BF_CLIENT_WIZARD_URL_SOT_v56_STALE_TEST_ANCHOR
