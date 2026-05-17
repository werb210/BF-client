// BF_CLIENT_BLOCK_TWO_STAGE_v1 -- Personal Net Worth Statement.
// Digital version of CBF_PNW.docx.
import { useCallback, useEffect, useState } from "react";
import { getFormResponse, saveFormResponse, submitFormResponse } from "@/lib/api";

type PnwData = {
  full_legal_name?: string;
  alternate_names?: string;
  sin?: string;
  birth_month?: string;
  birth_day?: string;
  birth_year?: string;
  marital_status?: "single" | "common_law" | "married" | "divorced" | "separated" | "widowed";
  dependants?: string;
  home_phone?: string;
  work_phone?: string;
  fax_phone?: string;
  cell_phone?: string;
  personal_email?: string;
  work_email?: string;
  mailing_address?: string;
  mailing_city?: string;
  mailing_province?: string;
  mailing_postal?: string;
  mailing_duration?: string;
  physical_address?: string;
  physical_city?: string;
  physical_province?: string;
  physical_postal?: string;
  physical_duration?: string;
  spouse_name?: string;
  spouse_address?: string;
  spouse_postal?: string;
  spouse_phone?: string;
  spouse_employer?: string;
  spouse_employer_address?: string;
  spouse_income?: string;
  spouse_duration?: string;
  other_income_source?: string;
  other_income_details?: string;
  other_income_amount?: string;
  other_income_duration?: string;
  ref1_name?: string; ref1_address?: string; ref1_relationship?: string; ref1_phone?: string;
  ref2_name?: string; ref2_address?: string; ref2_relationship?: string; ref2_phone?: string;
  ref3_name?: string; ref3_address?: string; ref3_relationship?: string; ref3_phone?: string;
  landlord_name?: string;
  landlord_phone?: string;
  landlord_rent?: string;
  disc_bankruptcy?: "yes" | "no";
  disc_bankruptcy_details?: string;
  disc_criminal?: "yes" | "no";
  disc_criminal_details?: string;
  disc_prior_denial?: "yes" | "no";
  disc_prior_denial_details?: string;
  disc_taxes_satisfied?: "yes" | "no";
  disc_taxes_details?: string;
  disc_legal_actions?: "yes" | "no";
  disc_legal_actions_details?: string;
  disc_cosigner?: "yes" | "no";
  disc_cosigner_details?: string;
  details_disclosure?: string;
  cash?: number; rrsp?: number; tfsa?: number; stocks_bonds?: number;
  accounts_receivable?: number; liquid_other_a?: number; liquid_other_b?: number;
  credit_cards_balance?: number; credit_cards_payment?: number;
  rrsp_loans_balance?: number; rrsp_loans_payment?: number;
  other_loans_balance?: number; other_loans_payment?: number;
  stock_margin_balance?: number; stock_margin_payment?: number;
  loc_balance?: number; loc_payment?: number;
  taxes_owing_balance?: number; taxes_owing_payment?: number;
  liab_other_balance?: number; liab_other_payment?: number;
  vehicles?: Array<{ description?: string; value?: number; lien_holder?: string; balance?: number; payment?: number }>;
  real_estate?: Array<{ address?: string; value?: number; mortgage_holder?: string; balance?: number; payment?: number }>;
  other_assets?: Array<{ description?: string; value?: number; lien_holder?: string; balance?: number; payment?: number }>;
  attest_truth?: boolean;
  attest_authorization?: boolean;
  signature_typed_name?: string;
  signature_date?: string;
};

const EMPTY: PnwData = {
  vehicles: [{}, {}, {}],
  real_estate: [{}, {}, {}],
  other_assets: [{}, {}, {}, {}, {}],
};

const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 13, borderRadius: 4, border: "1px solid #d1d5db" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 2, display: "block" };
const sectionStyle: React.CSSProperties = { marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" };
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#111827" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v || "0"));
  return Number.isFinite(n) ? n : 0;
}
function sum(...xs: unknown[]): number { return xs.reduce<number>((a, b) => a + num(b), 0); }
function money(n: number): string { return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }); }

export default function PersonalNetWorthForm({
  applicationId,
  onComplete,
}: { applicationId: string; onComplete: () => void }) {
  const [data, setData] = useState<PnwData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const existing = await getFormResponse(applicationId, "personal_net_worth_statement");
        if (existing) {
          setData({ ...EMPTY, ...(existing.data as PnwData) });
          setSubmitted(!!existing.submitted_at);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoaded(true);
      }
    })();
  }, [applicationId]);

  const update = (patch: Partial<PnwData>) => setData((d) => ({ ...d, ...patch }));

  const updateLine = (field: "vehicles" | "real_estate" | "other_assets", idx: number, patch: Record<string, unknown>) => {
    setData((d) => {
      const arr = [...(d[field] || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, [field]: arr };
    });
  };

  const autosave = useCallback(async () => {
    setSaving(true);
    try {
      await saveFormResponse(applicationId, "personal_net_worth_statement", data as unknown as Record<string, unknown>);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [applicationId, data]);

  const handleSubmit = async () => {
    if (!data.attest_truth || !data.attest_authorization) {
      alert("Please confirm both attestations before submitting.");
      return;
    }
    if (!data.signature_typed_name?.trim()) {
      alert("Please type your full legal name as your signature.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFormResponse(applicationId, "personal_net_worth_statement", data as unknown as Record<string, unknown>);
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <div>Loading form...</div>;

  const liquidAssets = sum(data.cash, data.rrsp, data.tfsa, data.stocks_bonds, data.accounts_receivable, data.liquid_other_a, data.liquid_other_b);
  const vehicleAssets = (data.vehicles || []).reduce((a, v) => a + num(v.value), 0);
  const realEstateAssets = (data.real_estate || []).reduce((a, r) => a + num(r.value), 0);
  const otherAssetsTotal = (data.other_assets || []).reduce((a, o) => a + num(o.value), 0);
  const totalAssets = liquidAssets + vehicleAssets + realEstateAssets + otherAssetsTotal;

  const totalLiabilitiesLiquid = sum(
    data.credit_cards_balance, data.rrsp_loans_balance, data.other_loans_balance,
    data.stock_margin_balance, data.loc_balance, data.taxes_owing_balance, data.liab_other_balance,
  );
  const vehicleLiens = (data.vehicles || []).reduce((a, v) => a + num(v.balance), 0);
  const mortgages = (data.real_estate || []).reduce((a, r) => a + num(r.balance), 0);
  const otherLiens = (data.other_assets || []).reduce((a, o) => a + num(o.balance), 0);
  const totalLiabilities = totalLiabilitiesLiquid + vehicleLiens + mortgages + otherLiens;
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div onBlur={() => void autosave()}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Personal Statement of Affairs</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        {saving ? "Saving..." : "Saved"}{error ? ` — ${error}` : ""}
        {submitted && <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>✓ Submitted</span>}
      </p>

      <div style={sectionStyle}><div style={sectionTitle}>...</div></div>
    </div>
  );
}
