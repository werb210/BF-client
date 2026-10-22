// BF_CLIENT_v846_FRAUD - the fraud signals: field NAMES only, never values; one random device id; a stable answers
// fingerprint; fire-and-forget after submit.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answersForFingerprint, buildSignals, fieldName, getDeviceId, isSensitiveField, noteStep, sendFraudSignals, sha256Hex, startFraudSignals } from "../signals";

function input(attrs: Record<string, string>, tag = "input"): HTMLInputElement {
  const el = document.createElement(tag) as HTMLInputElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

let stop: () => void = () => undefined;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
});
afterEach(() => {
  stop();
  vi.unstubAllGlobals();
});

describe("fraud signals", () => {
  it("matches sensitive field names on whole tokens", () => {
    expect(isSensitiveField("accountNumber")).toBe(true);
    expect(isSensitiveField("applicant.sin")).toBe(true);
    expect(isSensitiveField("dateOfBirth")).toBe(true);
    expect(isSensitiveField("business_name")).toBe(false);
    expect(isSensitiveField("purposeOfFunds")).toBe(false);
    expect(fieldName(input({ name: "applicant[sin]" }))).toBe("applicant_sin_");
    expect(fieldName(document.createElement("div"))).toBeNull();
  });

  it("records pasted sensitive fields and autofill, never the values", async () => {
    stop = startFraudSignals();
    const sin = input({ name: "sin" });
    const biz = input({ name: "business_name" });
    const paste = (el: HTMLElement) => el.dispatchEvent(Object.assign(new Event("paste", { bubbles: true }), { clipboardData: { getData: () => "123 456 789" } }));
    paste(sin); paste(biz); paste(sin);
    sin.value = "123456789";
    sin.dispatchEvent(new Event("input", { bubbles: true })); // no inputType -> autofill
    biz.value = "Acme";
    biz.dispatchEvent(Object.assign(new Event("input", { bubbles: true }), { inputType: "insertText" }));
    noteStep(1); noteStep(2); noteStep(2);
    const body = await buildSignals({ applicationToken: "11111111-2222-4333-8444-555555555555", kyc: { fundingAmount: "50000" } });
    expect(body!.behaviour).toMatchObject({ fields_completed: 2, pasted_fields: ["sin"], autofill_used: true, steps: 2 });
    const all = JSON.stringify(body) + JSON.stringify(sessionStorage);
    expect(all).not.toContain("123456789");
    expect(all).not.toContain("123 456 789");
    expect(all).not.toContain("Acme");
  });

  it("keeps one random device id", () => {
    const a = getDeviceId();
    expect(a).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(getDeviceId()).toBe(a);
  });

  it("fingerprints the answers that do not depend on the business name, only when there are enough", async () => {
    const app = { kyc: { fundingAmount: "$50,000", purposeOfFunds: "Inventory", industry: "Retail", annualRevenue: "500k", yearsInBusiness: "3" }, business: { businessName: "Acme", address: "1 Main St" } };
    const other = { ...app, business: { businessName: "Other Co", address: "1 main st." } };
    expect(answersForFingerprint(app)).toBe(answersForFingerprint(other));
    expect(answersForFingerprint({ kyc: { fundingAmount: "1" } })).toBe("");
    expect(await sha256Hex(answersForFingerprint(app))).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("")).toBeNull();
  });

  it("posts once after submit with keepalive, and never throws even when the network fails", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("offline"); });
    vi.stubGlobal("fetch", fetchMock);
    stop = startFraudSignals();
    expect(() => sendFraudSignals({ applicationToken: "11111111-2222-4333-8444-555555555555" })).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/client\/fraud-signals$/);
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(String(init.body))).toMatchObject({ application_id: "11111111-2222-4333-8444-555555555555", platform: "web" });
    sendFraudSignals({});
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1); // no application id: nothing is sent
  });
});
