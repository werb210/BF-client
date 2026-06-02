// BF_CLIENT_BLOCK_v301_ACCORD_CMP_FORMS_v1 — CRA View-Only Authorization.
// Boreal-branded instructions and acknowledgement persisted as "cra_authorization".
import { useEffect, useState } from "react";
import { getFormResponse, submitFormResponse } from "@/lib/api";

const ACCORD_BN = "840554489";
const ACCORD_FIRM_NAME = "ACCORD SMALL BUSINESS FINANCE CORP.";

const STEPS = [
  "Log into your CRA My Business account.",
  "Click PROFILE (top-right corner).",
  "Scroll down to Authorized representatives, then click Manage authorized representatives.",
  "Click Authorize a representative.",
  `In the box labeled \"RepID, GroupID, or BN (required)\", enter the business number ${ACCORD_BN} (no spaces).`,
  "Click Next.",
  `Confirm the firm name shows as ${ACCORD_FIRM_NAME} — if any other name appears, you entered the wrong business number.`,
  'For "Level of authorization for this representative", select View only (level 1).',
  'Leave the "Expiry Date" field blank.',
  "Under the accounts list, tick the first option (All accounts).",
  "Click Next.",
  "On the confirmation screen, verify firm name, all accounts, View only (level 1), all years, and no expiry date.",
  'Tick the "Confirmation (required)" box, then click Submit.',
  "Return here and confirm below.",
];

export default function CraAuthorizationForm({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    try { const existing = await getFormResponse(applicationId, "cra_authorization"); if (existing) { setAcknowledged(!!(existing.data as { acknowledged?: boolean } | undefined)?.acknowledged); setSubmitted(!!existing.submitted_at); } } catch { /* no saved response yet */ }
  })(); }, [applicationId]);

  const handleSubmit = async () => {
    if (!acknowledged) { alert("Please confirm you have completed the CRA authorization."); return; }
    setSubmitting(true);
    try { await submitFormResponse(applicationId, "cra_authorization", { acknowledged: true, completed_at: new Date().toISOString() }); setSubmitted(true); onComplete(); }
    catch (err) { setError(err instanceof Error ? err.message : "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>CRA View-Only Authorization</h2>
    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>To complete underwriting, Boreal Financial requires read-only access to your CRA business account. Follow the steps below in CRA My Business. Access is view-only and cannot be used to alter or submit anything to CRA.{submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Confirmed</span>}</p>
    <ol style={{ fontSize: 14, lineHeight: 1.6, color: "#111827", paddingLeft: 20 }}>{STEPS.map((s, i) => <li key={i} style={{ marginBottom: 8 }}>{s}</li>)}</ol>
    <div style={{ marginTop: 12, padding: 12, background: "#f1f5f9", borderRadius: 8, fontSize: 13, color: "#374151" }}><strong>Verify before submitting:</strong> firm name must read <em>{ACCORD_FIRM_NAME}</em> and the business number is <strong>{ACCORD_BN}</strong>.</div>
    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>After completing the authorization, please let your Boreal Financial representative know — CRA does not send an alert when authorization is granted.</p>
    {error && <p style={{ color: "#991b1b", fontSize: 13 }}>{error}</p>}
    <label style={{ display: "block", fontSize: 14, marginTop: 16 }}><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I have completed the CRA View-Only (level 1) authorization for Boreal Financial.</label>
    <button type="button" disabled={submitting} onClick={() => void handleSubmit()} style={{ marginTop: 16, padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>{submitting ? "Submitting…" : "Confirm Authorization"}</button>
  </div>;
}
