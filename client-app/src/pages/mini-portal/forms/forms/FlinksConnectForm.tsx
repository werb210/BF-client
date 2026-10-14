// BF_CLIENT_BLOCK_v302_FLINKS_CONNECT_v1 — Banking (Flinks view-only) connect.
// No-dependency version: opens Accord's hosted Flinks Connect in a new tab and
// records the applicant's self-attestation that they connected. Persists via
// the generic form-responses endpoint, key "flinks_banking".
//
// FUTURE (embed path, gated on Accord allowing our domain to frame their
// instance + emit events to our origin): replace the button below with an
// <iframe src={FLINKS_URL} /> and a window "message" listener that flips
// `connected` true on the Flinks REDIRECT/success event (carrying loginId),
// then auto-submits. The form key + storage shape stay the same, so only the
// render swaps — see the EMBED seam marked below.
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { readDraft, useFormDraft } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS

// Accord's hosted Flinks Connect instance (from the Accord credit application).
const FLINKS_URL = "https://accordfinancial.flinksapp.io";

export default function FlinksConnectForm({
  applicationId,
  onComplete,
}: { applicationId: string; onComplete: () => void }) {
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BF_CLIENT_v805_FORMS - remember the tick if the sheet closes before Confirm.
  const [hydrated, setHydrated] = useState(false);
  const clearLocalDraft = useFormDraft("flinks_banking", applicationId, { opened, confirmed }, hydrated);

  useEffect(() => {
    void (async () => {
      try {
        const existing = await getFormResponse(applicationId, "flinks_banking");
        if (existing) {
          const d = (existing.data || {}) as { opened?: boolean; connected?: boolean };
          setOpened(!!d.opened);
          setConfirmed(!!d.connected);
          setSubmitted(!!existing.submitted_at);
        }
      } catch {
        // first-time open has no saved response — ignore
      }
      const draft = readDraft<{ opened?: boolean; confirmed?: boolean }>("flinks_banking", applicationId);
      if (draft?.opened) setOpened(true);
      if (draft?.confirmed) setConfirmed(true);
      setHydrated(true);
    })();
  }, [applicationId]);

  const openFlinks = () => {
    window.open(FLINKS_URL, "_blank", "noopener,noreferrer");
    setOpened(true);
    void saveFormResponse(applicationId, "flinks_banking", {
      opened: true,
      opened_at: new Date().toISOString(),
    }).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      alert("Please confirm you've connected your bank before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, "flinks_banking", {
        opened: true,
        connected: true,
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

  return (
    <div className="cmpf">
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Connect Your Bank (View-Only)</h2>
      <p className="cmpf-intro">
        Underwriting requires a secure, view-only connection to your business bank account. This is
        read-only - it cannot move money or make changes. The connection is provided by Flinks.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Confirmed</span>}
      </p>

      {/* BF_CLIENT_v805_FORMS - no "tab" wording: in the app this is not a tab. */}
      <ol className="cmpf-steps">
        <li>Tap <strong>Connect Bank</strong> below. A secure Flinks window opens.</li>
        <li>Choose your bank, sign in, and select the account(s) to share (view-only).</li>
        <li>When you see the success screen, come back here and confirm below.</li>
      </ol>

      {/* EMBED seam — when Accord whitelists our domain + emits events to our
          origin, replace this button with an <iframe src={FLINKS_URL}/> and a
          window "message" listener that sets confirmed=true on the success
          event, then calls handleSubmit() automatically. */}
      <button type="button" className="cmpf-cta" onClick={openFlinks}>
        Connect Bank
      </button>

      {error && <p className="cmpf-error">{error}</p>}

      <label className={`cmpf-check${opened ? "" : " cmpf-check--disabled"}`}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!opened}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>I have connected my business bank account (view-only) through Flinks.</span>
      </label>

      <div className="cmpf-actions">
        <button
          type="button"
          className="cmpf-primary"
          disabled={submitting || !confirmed}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Submitting..." : "Confirm Connection"}
        </button>
      </div>
    </div>
  );
}
