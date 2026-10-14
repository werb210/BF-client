// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — CRA View-Only Authorization.
// Two variants per Accord's 08232024 instructions: Corporate Entities, and
// Individuals / Sole Proprietorships / Partnerships. The applicant picks the
// entity type and follows the matching steps, then attests completion.
// Persists via the generic form-responses endpoint, key "cra_view_only_authorization".
import { useEffect, useState } from "react";
import { getFormResponse, submitFormResponse, saveFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { mergeDraft, readDraft, useFormDraft } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS
import { openExternal } from "@/native/openExternal"; // BF_CLIENT_v805_PHONE_FIXES

const FORM_KEY = "cra_view_only_authorization";
const ACCORD_BN = "840554489";
const ACCORD_FIRM = "ACCORD SMALL BUSINESS FINANCE CORP.";

type EntityType = "corporate" | "individual";

// BF_CLIENT_v805_FORMS - the steps were long paragraphs that filled a phone
// screen each. Same facts, one short line per step.
export const CRA_MY_BUSINESS_URL =
  "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/business-account.html";

export const CORPORATE_STEPS: string[] = [
  "Sign in to CRA My Business Account.",
  "Tap PROFILE (top right).",
  "Under Authorized representatives, tap Manage authorized representatives.",
  "Tap Authorize a representative.",
  `In "RepID, GroupID, or BN", enter ${ACCORD_BN} (no spaces), then Next.`,
  `Check the firm shows as ${ACCORD_FIRM} (if not, re-check the number).`,
  "Level of authorization: View Only (level 1).",
  "Expiry Date: leave blank.",
  "Accounts: tick the first option (All accounts), then Next.",
  "Check: firm name, All accounts, View only (level 1), All years, Does not expire.",
  "Tick Confirmation, then Submit. A confirmation page appears.",
];

export const INDIVIDUAL_STEPS: string[] = [
  "Sign in to CRA My Account.",
  "Tap your name (top right), then Profile.",
  "Under Authorized representative(s), tap + Add.",
  "On Authorize a Representative, tap Start.",
  `In "RepID, GroupID, or BN", enter ${ACCORD_BN} (no spaces), then Search.`,
  "Check Accord Small Business Finance appears (if not, re-check the number), then Next.",
  "Authorization Level: Level 1 (View Only).",
  "Online Access: Yes.",
  "Expiry Date: does not expire, then Next.",
  "Tick the authorization box, then Submit. A confirmation page appears.",
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
  const [hydrated, setHydrated] = useState(false); // BF_CLIENT_v805_FORMS
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, { entity_type: entityType, confirmed }, hydrated);

  useEffect(() => {
    void (async () => {
      let server: { entity_type?: EntityType; confirmed?: boolean } = {};
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing) {
          server = (existing.data || {}) as { entity_type?: EntityType; confirmed?: boolean };
          setSubmitted(!!existing.submitted_at);
        }
      } catch {
        // first open — no saved response
      }
      const d = mergeDraft(server, readDraft(FORM_KEY, applicationId)); // BF_CLIENT_v805_FORMS
      if (d.entity_type) setEntityType(d.entity_type);
      setConfirmed(!!d.confirmed);
      setHydrated(true);
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
      clearLocalDraft(); // BF_CLIENT_v805_FORMS
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
    <button type="button" aria-pressed={entityType === t} onClick={() => onPickEntity(t)}>
      {label}
    </button>
  );

  const openCra = () => { void openExternal(CRA_MY_BUSINESS_URL); }; // BF_CLIENT_v805_PHONE_FIXES - in-app browser

  return (
    <div className="cmpf">
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>CRA View-Only Authorization</h2>
      <p className="cmpf-intro">
        Grant view-only (Level 1) access to {ACCORD_FIRM} (business number {ACCORD_BN}). This is read-only -
        Accord cannot file or change anything with the CRA.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Confirmed</span>}
      </p>

      <div className="cmpf-seg" role="group" aria-label="Who is authorizing">
        {tab("corporate", "Corporation")}
        {tab("individual", "Individual / Sole Prop / Partnership")}
      </div>

      <button type="button" className="cmpf-cta" onClick={openCra}>
        Open CRA My Business
      </button>

      <ol className="cmpf-steps" data-testid="cra-steps" style={{ marginTop: 12 }}>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <p className="cmpf-note">
        Important: Accord is not alerted when you finish. After submitting, please let your Accord representative know.
      </p>

      {error && <p className="cmpf-error">{error}</p>}

      <label className="cmpf-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>I have completed the CRA view-only authorization for Accord.</span>
      </label>

      <div className="cmpf-actions">
        <button
          type="button"
          className="cmpf-primary"
          disabled={submitting || !confirmed}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Submitting..." : "Confirm Authorization"}
        </button>
      </div>
    </div>
  );
}
