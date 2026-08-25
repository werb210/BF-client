// BF_CLIENT_BLOCK_TWO_STAGE_v1
// Stage 2 mini-portal landing. Lists every Stage 2 doc for the
// application. Items with a registered form component open in
// place; everything else falls through to an upload row.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DocPicker from "@/components/DocPicker";
import { listFormResponses, type FormResponse } from "@/lib/api";
import PersonalNetWorthForm from "./forms/PersonalNetWorthForm";
import DebtStackForm from "./forms/DebtStackForm";
import CraAuthorizationForm from "./forms/CraAuthorizationForm";
import RealEstateCollateralForm from "./forms/RealEstateCollateralForm";
// BF_CLIENT_BLOCK_v700_ADVISORS_FORM_v1
import AdvisorsForm from "./forms/AdvisorsForm";
// BF_CLIENT_SBA_413_v198
import Sba413Form from "./forms/Sba413Form";

type RequiredDoc = {
  document_type: string;
  required: boolean;
  stage: 1 | 2;
  min_amount?: number;
  max_amount?: number;
};

// BF_CLIENT_BLOCK_v304_ACCORD_FORMS_REBUILD_v1 — keys match portal DOCUMENT_TYPES / creator enum values.
const FORM_RENDERERS: Record<string, React.ComponentType<{ applicationId: string; onComplete: () => void }>> = {
  net_worth_statement: PersonalNetWorthForm,
  debt_stack: DebtStackForm,
  cra_view_only_authorization: CraAuthorizationForm,
  real_estate_collateral_disclosure: RealEstateCollateralForm,
  // BF_CLIENT_BLOCK_v700_ADVISORS_FORM_v1
  professional_advisors: AdvisorsForm,
  // BF_CLIENT_SBA_413_v198 - key must match the document_type on the SBA lender
  // products, or the row falls through to a plain file upload instead of the form.
  sba_form_413: Sba413Form,
};

function humanLabel(docType: string): string {
  return docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Stage2Page() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([]);
  const [responses, setResponses] = useState<Record<string, FormResponse>>({});
  const [activeForm, setActiveForm] = useState<string | null>(null);
  // BF_CLIENT_BLOCK_v_STAGE2_UPLOAD_v1 — upload rows now open the real DocPicker.
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        application_id: applicationId,
        stage: "2",
      });
      const docsRes = await fetch(`/api/portal/lender-products/required-docs?${params}`, {
        credentials: "include",
      });
      const docsJson = await docsRes.json();
      const stage2 = (Array.isArray(docsJson.items) ? docsJson.items : []).filter(
        (d: RequiredDoc) => d.stage === 2,
      );
      setRequiredDocs(stage2);

      const items = await listFormResponses(applicationId);
      const byType: Record<string, FormResponse> = {};
      for (const r of items) byType[r.doc_type] = r;
      setResponses(byType);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const d of requiredDocs) {
      if (FORM_RENDERERS[d.document_type]) {
        total += 1;
        if (responses[d.document_type]?.submitted_at) done += 1;
      }
    }
    return { done, total };
  }, [requiredDocs, responses]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ padding: 24, color: "#dc2626" }}>{error}</div>;

  if (activeForm && FORM_RENDERERS[activeForm] && applicationId) {
    const FormComponent = FORM_RENDERERS[activeForm];
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <button
          onClick={() => {
            setActiveForm(null);
            void load();
          }}
          style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13, cursor: "pointer", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4 }}
        >
          ← Back to forms
        </button>
        <FormComponent
          applicationId={applicationId}
          onComplete={() => {
            setActiveForm(null);
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Continue your application</h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
        We've received your initial documents. The items below are needed
        so lenders can complete their review. Your progress saves
        automatically -- come back any time.
      </p>

      {progress.total > 0 && (
        <div style={{
          padding: 12, marginBottom: 20, borderRadius: 8,
          background: progress.done === progress.total ? "#d1fae5" : "#fef3c7",
          fontSize: 13, fontWeight: 600,
          color: progress.done === progress.total ? "#065f46" : "#92400e",
        }}>
          {progress.done} of {progress.total} forms completed
        </div>
      )}

      {requiredDocs.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
          Nothing more needed right now. We'll text you if a lender
          requests anything additional.
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {requiredDocs.map((doc) => {
          const isForm = !!FORM_RENDERERS[doc.document_type];
          const response = responses[doc.document_type];
          const isComplete = !!response?.submitted_at;
          const isDraft = !!response && !response.submitted_at;
          return (
            <li
              key={doc.document_type}
              style={{
                padding: 14,
                border: "1px solid " + (isComplete ? "#10b981" : "#e5e7eb"),
                borderRadius: 8,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                  {humanLabel(doc.document_type)}
                  {isForm && (
                    <span style={{
                      marginLeft: 8, padding: "2px 6px", fontSize: 10,
                      background: "#dbeafe", color: "#1e40af", borderRadius: 3,
                      fontWeight: 600,
                    }}>📝 form</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {isComplete ? "✓ Completed" : isDraft ? "Draft saved" : "Not started"}
                </div>
              </div>
              {isForm ? (
                <button
                  onClick={() => setActiveForm(doc.document_type)}
                  style={{
                    padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    background: isComplete ? "#fff" : "#1E3A8A",
                    color: isComplete ? "#1E3A8A" : "#fff",
                    border: "1px solid #1E3A8A",
                    borderRadius: 4, cursor: "pointer",
                  }}
                >
                  {isComplete ? "Review / edit" : isDraft ? "Continue" : "Start form"}
                </button>
              ) : (
                <button
                  onClick={() => setShowUpload(true)}
                  style={{
                    padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    background: isComplete ? "#fff" : "#1E3A8A",
                    color: isComplete ? "#1E3A8A" : "#fff",
                    border: "1px solid #1E3A8A",
                    borderRadius: 4, cursor: "pointer",
                  }}
                >
                  {isComplete ? "Uploaded" : "Upload"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {showUpload && applicationId && (
        <DocPicker
          applicationId={applicationId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); void load(); }}
        />
      )}
    </div>
  );
}
