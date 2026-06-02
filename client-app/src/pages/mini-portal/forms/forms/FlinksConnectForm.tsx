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
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Connect Your Bank (View-Only)</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        Underwriting requires a secure, view-only connection to your business bank account. This is
        read-only — it cannot move money or make changes. The connection is provided by Flinks.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Confirmed</span>}
      </p>

      <ol style={{ fontSize: 14, lineHeight: 1.6, color: "#111827", paddingLeft: 20 }}>
        <li style={{ marginBottom: 8 }}>Click <strong>Connect Bank</strong> below. A secure Flinks window opens in a new tab.</li>
        <li style={{ marginBottom: 8 }}>Choose your bank, sign in, and select the account(s) to share (view-only).</li>
        <li style={{ marginBottom: 8 }}>When you see the success screen, return to this tab and confirm below.</li>
      </ol>

      {/* EMBED seam — when Accord whitelists our domain + emits events to our
          origin, replace this button with an <iframe src={FLINKS_URL}/> and a
          window "message" listener that sets confirmed=true on the success
          event, then calls handleSubmit() automatically. */}
      <button
        type="button"
        onClick={openFlinks}
        style={{ marginTop: 8, padding: "12px 24px", background: "#0b1320", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}
      >
        Connect Bank →
      </button>

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <label style={{ display: "block", fontSize: 14, marginTop: 20, opacity: opened ? 1 : 0.5 }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!opened}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        I have connected my business bank account (view-only) through Flinks.
      </label>

      <button
        type="button"
        disabled={submitting || !confirmed}
        onClick={() => void handleSubmit()}
        style={{ marginTop: 16, padding: "12px 24px", background: confirmed ? "#0b1320" : "#9ca3af", color: "#fff", border: 0, borderRadius: 8, cursor: confirmed ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Submitting…" : "Confirm Connection"}
      </button>
    </div>
  );
}
