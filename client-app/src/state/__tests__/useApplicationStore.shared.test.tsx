/* @vitest-environment jsdom */
import { describe,it,expect,beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useApplicationStore, __resetSingletonForTests } from "../useApplicationStore";
describe("singleton store",()=>{beforeEach(()=>{localStorage.clear();__resetSingletonForTests();});it("shared updates",async()=>{let a:any,b:any;const A=(): null => {a=useApplicationStore();return null}; const B=(): null => {b=useApplicationStore();return null}; const d=document.createElement('div'); const r=createRoot(d); await act(async()=>{r.render(<><A/><B/></>)}); await act(async()=>{a.update({applicationToken:'22222222-2222-4222-8222-222222222222'})}); expect(b.app.applicationToken).toBe('22222222-2222-4222-8222-222222222222'); r.unmount();});});
// BF_CLIENT_WIZARD_SHARED_STORE_v57_SHARED_TEST_ANCHOR
