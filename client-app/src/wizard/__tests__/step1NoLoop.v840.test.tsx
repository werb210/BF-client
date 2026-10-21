// BF_CLIENT_v840_STEP1_NO_LOOP - a returning client's prefill must not make Step 1 redraw forever (it froze every
// dropdown and the amount box). Before the fix this test never finished.
import React, { act, Profiler } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/readiness", () => ({
  fetchReadinessPrefill: vi.fn().mockResolvedValue({ found: true, prefill: { companyName: "Acme", business: { city: "Calgary" } } }),
}));
vi.mock("../../services/creditPrefill", () => ({ fetchCreditPrefill: vi.fn().mockResolvedValue(null) }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../../utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn() }));
vi.mock("../../lender/productSync", () => ({ ProductSync: { load: (): unknown[] => [], sync: async (): Promise<unknown[]> => [] } }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn(), useParams: () => ({}), useLocation: () => ({ pathname: "/apply/step-1", search: "" }) }));

import { Step1_KYC } from "../Step1_KYC";
import { fetchReadinessPrefill } from "@/api/readiness";
import { clearReadiness } from "../../state/readinessStore";
import { __resetSingletonForTests } from "../../state/useApplicationStore";

describe("Step 1 after a returning client signs in", () => {
  it("does not keep re-rendering after a returning client's prefill", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearReadiness();
    __resetSingletonForTests();
    sessionStorage.setItem("verified_phone", "+15875550100");
    let commits = 0;
    const el = document.createElement("div"); document.body.appendChild(el);
    const root = createRoot(el);
    try {
      await act(async () => { root.render(<Profiler id="s1" onRender={() => {
        commits++;
        if (commits > 100) throw new Error("Step 1 did not settle after prefill");
      }}><Step1_KYC /></Profiler>); });
      expect(fetchReadinessPrefill).toHaveBeenCalledWith("+15875550100", "phone");
      expect(sessionStorage.getItem("application_state_session")).toContain("Acme");
      await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
      const a = commits;
      await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
      expect(commits - a).toBeLessThan(5);
    } finally {
      await act(async () => { root.unmount(); });
      el.remove();
      sessionStorage.removeItem("verified_phone");
      clearReadiness();
      localStorage.clear();
      sessionStorage.clear();
      __resetSingletonForTests();
    }
  }, 20_000);
});
