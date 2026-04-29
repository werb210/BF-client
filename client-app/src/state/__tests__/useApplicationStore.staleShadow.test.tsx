import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useApplicationStore } from "../useApplicationStore";
const FRESH_TOKEN = "22222222-2222-4222-8222-222222222222";
const STALE_TOKEN = "11111111-1111-4111-8111-111111111111";
describe("BF_CLIENT_WIZARD_URL_SOT_v56 — application_data must not shadow application_state", () => {
beforeEach(() => { localStorage.clear(); });
it("hydrates from application_state when both keys exist", async () => { localStorage.setItem("application_data", JSON.stringify({ currentStep:2, applicationToken: STALE_TOKEN, kyc:{fundingAmount:"$100"}})); localStorage.setItem("application_state", JSON.stringify({currentStep:5, applicationToken:FRESH_TOKEN, kyc:{fundingAmount:"$5000"}})); let api: ReturnType<typeof useApplicationStore> | null = null; const div=document.createElement("div"); const root=createRoot(div); function Probe(): null { api = useApplicationStore(); return null;} await act(async()=>{root.render(<Probe />)}); expect(api).not.toBeNull(); expect(api!.app.currentStep).toBe(5); expect(api!.app.applicationToken).toBe(FRESH_TOKEN); expect((api!.app.kyc as {fundingAmount?: string}).fundingAmount).toBe("$5000"); root.unmount(); });
it("purges application_data on boot even when application_state is empty", async () => { localStorage.setItem("application_data", JSON.stringify({ currentStep: 3, applicationToken: STALE_TOKEN })); const div=document.createElement("div"); const root=createRoot(div); function Probe(): null { useApplicationStore(); return null; } await act(async()=>{ root.render(<Probe />);}); expect(localStorage.getItem("application_data")).toBeNull(); root.unmount();});
it("purges application_data on boot when application_state exists", async () => { localStorage.setItem("application_data", JSON.stringify({ currentStep: 2, applicationToken: STALE_TOKEN })); localStorage.setItem("application_state", JSON.stringify({ currentStep: 4, applicationToken: FRESH_TOKEN })); const div=document.createElement("div"); const root=createRoot(div); function Probe(): null { useApplicationStore(); return null; } await act(async()=>{ root.render(<Probe />);}); expect(localStorage.getItem("application_data")).toBeNull(); expect(localStorage.getItem("application_state")).not.toBeNull(); root.unmount();});
});
// BF_CLIENT_WIZARD_URL_SOT_v56_STALE_TEST_ANCHOR
