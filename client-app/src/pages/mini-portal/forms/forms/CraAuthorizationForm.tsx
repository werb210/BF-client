// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — CRA View-Only Authorization.
// Two variants per Accord's 08232024 instructions: Corporate Entities, and
// Individuals / Sole Proprietorships / Partnerships. The applicant picks the
// entity type and follows the matching steps, then attests completion.
// Persists via the generic form-responses endpoint, key "cra_view_only_authorization".
import { useEffect, useState } from "react";
import { getFormResponse, submitFormResponse, saveFormResponse } from "@/lib/api";

const FORM_KEY = "cra_view_only_authorization";
const ACCORD_BN = "840554489";
const ACCORD_FIRM = "ACCORD SMALL BUSINESS FINANCE CORP.";

type EntityType = "corporate" | "individual";

const CORPORATE_STEPS: string[] = [
  "Log into your CRA My Business Account.",
  "Click PROFILE (top-right corner).",
  "Scroll to Authorized representatives, then click Manage authorized representatives.",
  "Click Authorize a representative.",
  `In the box labelled “RepID, GroupID, or BN (required)”, enter Accord's business number ${ACCORD_BN} (no spaces), then click Next.`,
  `Confirm the firm name shows as ${ACCORD_FIRM}. If a different name appears, you entered the wrong business number.`,
  "For Level of authorization, select View Only (level 1).",
  "Leave the Expiry Date blank.",
  "Under accounts this representative can access, tick the first option (All accounts), then click Next.",
  "On the confirmation screen, verify: firm name, All accounts, View only (level 1), All years, and Does not expire.",
  "Tick the Confirmation box, then click Submit. You'll receive a confirmation page.",
];

const INDIVIDUAL_STEPS: string[] = [
  "Log into your CRA My Account.",
  "Click your name (top-right) and select Profile.",
  "Scroll to Authorized representative(s) and click the “+ Add” button.",
  "On “Authorize a Representative”, click Start.",
  `In the box labelled “RepID, GroupID, or BN”, enter Accord's business number ${ACCORD_BN} (no spaces) and click Search.`,
  "Accord Small Business Finance and the BN will appear — click Next. If a different name appears, you entered the wrong business number.",
  "On Authorization Level, select Level 1 (View Only).",
  "On Online Access, select Yes.",
  "On Expiry Date, click “does not expire”, then click Next.",
  "On Confirmation, tick the authorization box and click Submit. You'll receive a confirmation page.",
];

export default function CraAuthorizationForm({
  applicationId,
  onComplete,
}: { applicationId: string; onComplete: () => void }) {
  const [entityType, setEntityType] = useState<EntityType>("corporate");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing) {
          const d = (existing.data || {}) as { entity_type?: EntityType; confirmed?: boolean };
          if (d.entity_type) setEntityType(d.entity_type);
          setConfirmed(!!d.confirmed);
          setSubmitted(!!existing.submitted_at);
        }
      } catch {
        // first open — no saved response
      }
    })();
  }, [applicationId]);

  const onPickEntity = (t: EntityType) => {
    setEntityType(t);
    void saveFormResponse(applicationId, FORM_KEY, { entity_type: t, confirmed }).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      alert("Please confirm you've completed the CRA authorization before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, FORM_KEY, {
        entity_type: entityType,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      });
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = entityType === "corporate" ? CORPORATE_STEPS : INDIVIDUAL_STEPS;

  const tab = (t: EntityType, label: string) => (
    <button
      type="button"
      onClick={() => onPickEntity(t)}
      style={{
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #d1d5db",
        background: entityType === t ? "#0b1320" : "#fff",
        color: entityType === t ? "#fff" : "#0f172a",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>CRA View-Only Authorization</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        Grant view-only (Level 1) access to {ACCORD_FIRM} (business number {ACCORD_BN}). This is read-only —
        Accord cannot file or change anything with the CRA.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Confirmed</span>}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tab("corporate", "Corporation")}
        {tab("individual", "Individual / Sole Prop / Partnership")}
      </div>

      <ol style={{ fontSize: 14, lineHeight: 1.6, color: "#111827", paddingLeft: 20 }}>
        {steps.map((step, i) => (
          <li key={i} style={{ marginBottom: 8 }}>{step}</li>
        ))}
      </ol>

      <p style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 12px", marginTop: 12 }}>
        Important: Accord is not alerted when you finish. After submitting, please let your Accord representative know.
      </p>

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <label style={{ display: "block", fontSize: 14, marginTop: 16 }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />{" "}
        I have completed the CRA view-only authorization for Accord.
      </label>

      <button
        type="button"
        disabled={submitting || !confirmed}
        onClick={() => void handleSubmit()}
        style={{ marginTop: 16, padding: "12px 24px", background: confirmed ? "#0b1320" : "#9ca3af", color: "#fff", border: 0, borderRadius: 8, cursor: confirmed ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Submitting…" : "Confirm Authorization"}
      </button>
    </div>
  );
}
