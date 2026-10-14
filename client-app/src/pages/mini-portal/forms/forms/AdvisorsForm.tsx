// BF_CLIENT_BLOCK_v700_ADVISORS_FORM_v1 — Professional Advisors (Accord
// page 1) + the financial advisor / consultant block (Accord page 2).
// Captures the optional CPA / Attorney / Insurance / A-R-credit-insurer
// rows. The financial advisor/consultant is always Boreal Financial, so
// that block is fixed text plus the authorization the applicant grants.
// Persists via the generic form-responses endpoint, key "professional_advisors".
// BF_CLIENT_v805_FORMS - CPA shows first; the other advisor types stay behind
// "+ Add ..." buttons until used (all four rows still submit, empty as before),
// tel/email/money keypads, a large authorization checkbox, pinned Submit, and
// a localStorage draft.
// BF_CLIENT_v807_FORMS - Canada and US wording, "Boreal Financial" in place of
// "Accord" in what the applicant reads, and the authorization text below.
import { useEffect, useState } from "react";
import { getFormResponse, submitFormResponse, saveFormResponse } from "@/lib/api";
import { formatPhoneNumber } from "@/utils/location"; // v_ADVISOR_PHONE_FMT_v1
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import { MoneyInput, isBlank, mergeDraft, readDraft, useFormDraft } from "../cmpFormKit"; // BF_CLIENT_v805_FORMS

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
  // BF_CLIENT_BLOCK_v710_ONGOING_MONITORING_v1
  const [monitoring, setMonitoring] = useState({ accountingSoftware: "", accountingRemoteView: "", primaryBank: "", bankRemoteView: "", craMyBusiness: "", balanceOutstanding: "", authorizedLimit: "" }); // BF_CLIENT_BLOCK_v_ACCORD_FIELDS_v1
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BF_CLIENT_v805_FORMS
  const [revealedAdvisors, setRevealedAdvisors] = useState<Set<AdvisorKey>>(new Set(["cpa"]));
  const [hydrated, setHydrated] = useState(false);
  const clearLocalDraft = useFormDraft(FORM_KEY, applicationId, { advisors, monitoring, authorized }, hydrated);

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
          if ((d as any).monitoring) setMonitoring((prev) => ({ ...prev, ...(d as any).monitoring }));
          setSubmitted(!!existing.submitted_at);
        }
      } catch {
        // first open — no saved response
      }
      // BF_CLIENT_v805_FORMS - lay the local draft over what the server returned.
      const draft = readDraft<{ advisors?: Record<AdvisorKey, AdvisorRow>; monitoring?: typeof monitoring; authorized?: boolean }>(FORM_KEY, applicationId);
      if (draft) {
        if (draft.advisors) setAdvisors((prev) => mergeDraft(prev, draft.advisors));
        if (draft.monitoring) setMonitoring((prev) => mergeDraft(prev, draft.monitoring));
        if (draft.authorized) setAuthorized(true);
      }
      setHydrated(true);
    })();
  }, [applicationId]);

  const buildPayload = (auth: boolean) => ({
    advisors,
    financial_advisor: { firm: FINANCIAL_ADVISOR_FIRM, authorized: auth },
    monitoring,
  });

  const setField = (key: AdvisorKey, field: keyof AdvisorRow, value: string) => {
    setAdvisors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };
  // BF_CLIENT_BLOCK_v710_ONGOING_MONITORING_v1
  const setMon = (k: string, v: string) => setMonitoring((prev) => ({ ...prev, [k]: v }));

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
      clearLocalDraft(); // BF_CLIENT_v805_FORMS
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // BF_CLIENT_v805_FORMS - an advisor block shows when it is CPA, holds data,
  // or the user asked for it.
  const advisorShown = (key: AdvisorKey) => revealedAdvisors.has(key) || !isBlank(advisors[key]);
  const hiddenAdvisors = ADVISOR_ROWS.filter(({ key }) => !advisorShown(key));
  const revealAdvisor = (key: AdvisorKey) => setRevealedAdvisors((prev) => new Set(prev).add(key));

  const text = (id: string, label: string, value: string, onChange: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="cmpf-label" htmlFor={id}>{label}</label>
      <input id={id} className="cmpf-input" value={value} onChange={(e) => onChange(e.target.value)} onBlur={persist} {...extra} />
    </div>
  );
  const yesNo = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className="cmpf-label" htmlFor={id}>{label}</label>
      <select id={id} className="cmpf-select" value={value} onChange={(e) => onChange(e.target.value)} onBlur={persist}>
        <option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>
      </select>
    </div>
  );
  const moneyField = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className="cmpf-label" htmlFor={id}>{label}</label>
      <MoneyInput id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={persist} />
    </div>
  );

  return (
    <div className="cmpf">
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Professional Advisors</h2>
      <p className="cmpf-intro">
        Optional. If you work with any of the advisors below, add their details so Boreal Financial can coordinate with them.
        Leave blank any that don't apply.
        {submitted && <span style={{ marginLeft: 12, color: A11Y_COLORS.successText, fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <div>
        {ADVISOR_ROWS.filter(({ key }) => advisorShown(key)).map(({ key, label }) => (
          <div key={key} className="cmpf-card" data-testid={`advisor-${key}`}>
            <div className="cmpf-card-title">{label}</div>
            <div className="cmp-grid-2">
              {text(`adv-${key}-firm`, "Firm", advisors[key].firm, (v) => setField(key, "firm", v), { "aria-label": `${label} firm` })}
              {text(`adv-${key}-contact`, "Contact", advisors[key].contact, (v) => setField(key, "contact", v), { "aria-label": `${label} contact`, autoComplete: "name" })}
              {text(`adv-${key}-phone`, "Phone", advisors[key].phone, (v) => setField(key, "phone", formatPhoneNumber(v, "CA")), { "aria-label": `${label} phone`, type: "tel", inputMode: "tel", autoComplete: "tel" })}
              {text(`adv-${key}-email`, "Email", advisors[key].email, (v) => setField(key, "email", v), { "aria-label": `${label} email`, type: "email", inputMode: "email", autoComplete: "email" })}
            </div>
          </div>
        ))}
      </div>
      {hiddenAdvisors.length > 0 && (
        <div data-testid="add-advisor">
          <div className="cmpf-sub" style={{ marginTop: 0 }}>Add another advisor</div>
          {hiddenAdvisors.map(({ key, label }) => (
            <button key={key} type="button" className="cmpf-add" onClick={() => revealAdvisor(key)}>+ {label}</button>
          ))}
        </div>
      )}

      {/* BF_CLIENT_BLOCK_v710_ONGOING_MONITORING_v1 */}
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "24px 0 6px" }}>Ongoing Monitoring</h3>
      <div className="cmpf-card">
        <div className="cmp-grid-2">
          {text("mon-software", "Accounting software used", monitoring.accountingSoftware, (v) => setMon("accountingSoftware", v))}
          {yesNo("mon-accounting-remote", "Remote view-only access?", monitoring.accountingRemoteView, (v) => setMon("accountingRemoteView", v))}
          {text("mon-bank", "Primary bank", monitoring.primaryBank, (v) => setMon("primaryBank", v))}
          {yesNo("mon-bank-remote", "Remote view-only access?", monitoring.bankRemoteView, (v) => setMon("bankRemoteView", v))}
          {/* BF_CLIENT_BLOCK_v_ACCORD_FIELDS_v1 - existing senior lender/bank (Accord page 1) */}
          {moneyField("mon-balance", "Balance outstanding (existing facility)", monitoring.balanceOutstanding, (v) => setMon("balanceOutstanding", v))}
          {moneyField("mon-limit", "Authorized limit (existing facility)", monitoring.authorizedLimit, (v) => setMon("authorizedLimit", v))}
          <div style={{ gridColumn: "1 / -1" }}>
            {yesNo("mon-cra", "Do you have CRA My Business (Canada) or an IRS online business account (US) set up?", monitoring.craMyBusiness, (v) => setMon("craMyBusiness", v))}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "24px 0 6px" }}>Financial Advisor / Consultant</h3>
      <div className="cmpf-card" style={{ background: "#F5F8FC" }}>
        <div style={{ fontSize: 15, color: "#0B1F3A" }}>
          Your financial advisor on this transaction is <strong>{FINANCIAL_ADVISOR_FIRM}</strong>.
        </div>
        <label className="cmpf-check">
          <input type="checkbox" checked={authorized} onChange={(e) => { setAuthorized(e.target.checked); void saveFormResponse(applicationId, FORM_KEY, buildPayload(e.target.checked)).catch(() => {}); }} />
          {/* BF_CLIENT_v807_FORMS */}
          <span>I authorize Boreal Financial to discuss this proposed credit facility with any of its lending partners.</span>
        </label>
      </div>

      {error && <p className="cmpf-error">{error}</p>}

      <div className="cmpf-actions">
        <button
          type="button"
          className="cmpf-primary"
          disabled={submitting || !authorized}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Submitting..." : "Submit Advisors"}
        </button>
      </div>
    </div>
  );
}
