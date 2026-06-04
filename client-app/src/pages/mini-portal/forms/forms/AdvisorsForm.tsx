// BF_CLIENT_BLOCK_v700_ADVISORS_FORM_v1 — Professional Advisors (Accord
// page 1) + the financial advisor / consultant block (Accord page 2).
// Captures the optional CPA / Attorney / Insurance / A-R-credit-insurer
// rows. The financial advisor/consultant is always Boreal Financial, so
// that block is fixed text plus the authorization the applicant grants.
// Persists via the generic form-responses endpoint, key "professional_advisors".
import { useEffect, useState } from "react";
import { getFormResponse, submitFormResponse, saveFormResponse } from "@/lib/api";

const FORM_KEY = "professional_advisors";
const FINANCIAL_ADVISOR_FIRM = "Boreal Financial";

type AdvisorRow = { firm: string; contact: string; phone: string; email: string };
type AdvisorKey = "cpa" | "attorney" | "insurance" | "ar_credit_insurance";

const ADVISOR_ROWS: { key: AdvisorKey; label: string }[] = [
  { key: "cpa", label: "CPA / Accounting Firm" },
  { key: "attorney", label: "Attorney / Law Firm" },
  { key: "insurance", label: "Insurance Agent" },
  { key: "ar_credit_insurance", label: "A/R Credit Insurance" },
];

const EMPTY_ROW: AdvisorRow = { firm: "", contact: "", phone: "", email: "" };

export default function AdvisorsForm({
  applicationId,
  onComplete,
}: { applicationId: string; onComplete: () => void }) {
  const [advisors, setAdvisors] = useState<Record<AdvisorKey, AdvisorRow>>({
    cpa: { ...EMPTY_ROW },
    attorney: { ...EMPTY_ROW },
    insurance: { ...EMPTY_ROW },
    ar_credit_insurance: { ...EMPTY_ROW },
  });
  const [authorized, setAuthorized] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const existing = await getFormResponse(applicationId, FORM_KEY);
        if (existing) {
          const d = (existing.data || {}) as {
            advisors?: Partial<Record<AdvisorKey, Partial<AdvisorRow>>>;
            financial_advisor?: { authorized?: boolean };
          };
          if (d.advisors) {
            setAdvisors((prev) => {
              const next = { ...prev };
              for (const { key } of ADVISOR_ROWS) {
                const row = d.advisors?.[key];
                if (row) next[key] = { ...EMPTY_ROW, ...row };
              }
              return next;
            });
          }
          setAuthorized(!!d.financial_advisor?.authorized);
          setSubmitted(!!existing.submitted_at);
        }
      } catch {
        // first open — no saved response
      }
    })();
  }, [applicationId]);

  const buildPayload = (auth: boolean) => ({
    advisors,
    financial_advisor: { firm: FINANCIAL_ADVISOR_FIRM, authorized: auth },
  });

  const setField = (key: AdvisorKey, field: keyof AdvisorRow, value: string) => {
    setAdvisors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const persist = () => {
    void saveFormResponse(applicationId, FORM_KEY, buildPayload(authorized)).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!authorized) {
      setError("Please authorize Boreal Financial to discuss the application before continuing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitFormResponse(applicationId, FORM_KEY, buildPayload(true));
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    boxSizing: "border-box",
  };
  const cellLabel: React.CSSProperties = { fontSize: 11, color: "#6b7280", marginBottom: 2 };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Professional Advisors</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        Optional. If you work with any of the advisors below, add their details so Accord can coordinate with them.
        Leave blank any that don't apply.
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ADVISOR_ROWS.map(({ key, label }) => (
          <div key={key} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={cellLabel}>Firm</div>
                <input style={inputStyle} value={advisors[key].firm} onChange={(e) => setField(key, "firm", e.target.value)} onBlur={persist} aria-label={`${label} firm`} />
              </div>
              <div>
                <div style={cellLabel}>Contact</div>
                <input style={inputStyle} value={advisors[key].contact} onChange={(e) => setField(key, "contact", e.target.value)} onBlur={persist} aria-label={`${label} contact`} />
              </div>
              <div>
                <div style={cellLabel}>Phone</div>
                <input style={inputStyle} value={advisors[key].phone} onChange={(e) => setField(key, "phone", e.target.value)} onBlur={persist} aria-label={`${label} phone`} />
              </div>
              <div>
                <div style={cellLabel}>Email</div>
                <input style={inputStyle} type="email" value={advisors[key].email} onChange={(e) => setField(key, "email", e.target.value)} onBlur={persist} aria-label={`${label} email`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 6 }}>Financial Advisor / Consultant</h3>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#f9fafb" }}>
        <div style={{ fontSize: 14, color: "#111827" }}>
          Your financial advisor on this transaction is <strong>{FINANCIAL_ADVISOR_FIRM}</strong>.
        </div>
        <label style={{ display: "block", fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
          <input type="checkbox" checked={authorized} onChange={(e) => { setAuthorized(e.target.checked); void saveFormResponse(applicationId, FORM_KEY, buildPayload(e.target.checked)).catch(() => {}); }} />{" "}
          I authorize Accord to discuss this proposed credit facility with {FINANCIAL_ADVISOR_FIRM}, including
          sharing personal and business credit information relating to the shareholders, related entities, and any
          proposed guarantor(s).
        </label>
      </div>

      {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <button
        type="button"
        disabled={submitting || !authorized}
        onClick={() => void handleSubmit()}
        style={{ marginTop: 16, padding: "12px 24px", background: authorized ? "#0b1320" : "#9ca3af", color: "#fff", border: 0, borderRadius: 8, cursor: authorized ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Submitting…" : "Submit Advisors"}
      </button>
    </div>
  );
}
