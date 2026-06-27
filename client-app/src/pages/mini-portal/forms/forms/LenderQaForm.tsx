// BF_CLIENT_LENDER_QA_v1
// CMP form behind the "Answer lender questions" button (cta_action 'lender_qa').
// Loads the questions the client must answer (newly sent or returned for a
// redo), autosaves each answer as they type, and submits them all at once.
import { useEffect, useState } from "react";
import { apiCall } from "@/api/client";
import { ClientAppAPI } from "@/api/clientApp"; // BF_CLIENT_QA_UPLOAD_v1

type Question = {
  id: string;
  position: number;
  prompt: string;
  request_document: boolean;
  answer_text: string | null;
  answer_document_id: string | null;
  review_status: string;
  reject_reason: string | null;
};

const styles = {
  h2: { fontSize: 22, fontWeight: 700, marginBottom: 6 } as const,
  intro: { fontSize: 13, color: "#6b7280", marginBottom: 14 } as const,
  card: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 12 } as const,
  prompt: { fontWeight: 600, fontSize: 15, marginBottom: 4 } as const,
  returned: { fontSize: 13, color: "#b45309", marginBottom: 8 } as const,
  docNote: { fontSize: 12, color: "#6b7280", marginTop: 8 } as const,
  upRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" as const } as const,
  upLabel: { fontSize: 13, fontWeight: 600, color: "#374151", padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", cursor: "pointer" } as const,
  upName: { fontSize: 12, color: "#065f46", wordBreak: "break-all" as const } as const,
  upErr: { fontSize: 12, color: "#b91c1c", marginTop: 6 } as const,
  textarea: {
    width: "100%",
    minHeight: 84,
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    boxSizing: "border-box" as const,
  } as const,
  err: { fontSize: 13, color: "#b91c1c", marginBottom: 10 } as const,
  ok: { fontSize: 13, color: "#6b7280", marginBottom: 10 } as const,
  btn: {
    marginTop: 4,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    border: 0,
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  } as const,
  btnDisabled: {
    marginTop: 4,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    border: 0,
    borderRadius: 8,
    background: "#93c5fd",
    color: "#fff",
    cursor: "not-allowed",
  } as const,
};

export default function LenderQaForm({
  applicationId,
  onComplete,
}: {
  applicationId: string;
  onComplete: () => void;
}) {
  const [setId, setSetId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, boolean>>({});
  const [docErr, setDocErr] = useState<Record<string, string>>({});

  const QA_UPLOAD_ACCEPT =
    ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.heic,.heif,.webp," +
    "application/pdf,application/msword,application/vnd.ms-excel," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "image/png,image/jpeg,image/heic,image/heif,image/webp,text/csv,text/plain";

  const base = `/api/portal/applications/${encodeURIComponent(applicationId)}/qa`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiCall<{ set: { id: string } | null; questions: Question[] }>(`${base}/open`);
        if (!alive) return;
        setSetId(r?.set?.id ?? null);
        const qs = r?.questions ?? [];
        setQuestions(qs);
        setAnswers(Object.fromEntries(qs.map((q) => [q.id, q.answer_text ?? ""])));
        setDocNames(
          Object.fromEntries(
            qs.filter((q) => q.answer_document_id).map((q) => [q.id, "Document attached"]),
          ),
        );
      } catch {
        if (alive) setErr("Could not load the questions. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const autosave = (qid: string, text: string) => {
    void apiCall(`${base}/questions/${qid}/answer`, {
      method: "PATCH",
      body: { answer_text: text },
    }).catch(() => {});
  };

  const uploadDoc = async (qid: string, file: File | null | undefined) => {
    if (!file) return;
    setDocErr((p) => ({ ...p, [qid]: "" }));
    setUploadingDoc((p) => ({ ...p, [qid]: true }));
    try {
      const r: unknown = await ClientAppAPI.uploadDocument({
        applicationId,
        documentType: "lender_qa",
        file,
      });
      const data = (r as { data?: { data?: { id?: string }; id?: string }; id?: string } | null) ?? null;
      const docId = data?.data?.data?.id ?? data?.data?.id ?? data?.id ?? null;
      if (!docId) throw new Error("no id");
      await apiCall(`${base}/questions/${qid}/answer`, {
        method: "PATCH",
        body: { answer_document_id: docId },
      });
      setDocNames((p) => ({ ...p, [qid]: file.name }));
    } catch {
      setDocErr((p) => ({
        ...p,
        [qid]: "Upload failed. Allowed: PDF, Word, Excel, or image (max 25MB).",
      }));
    } finally {
      setUploadingDoc((p) => ({ ...p, [qid]: false }));
    }
  };

  const submit = async () => {
    if (!setId) return;
    const missing = questions.some((q) => !(answers[q.id] ?? "").trim());
    if (missing) {
      setErr("Please answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await Promise.all(
        questions.map((q) =>
          apiCall(`${base}/questions/${q.id}/answer`, {
            method: "PATCH",
            body: { answer_text: answers[q.id] ?? "" },
          }).catch(() => {}),
        ),
      );
      await apiCall(`${base}/sets/${setId}/answers/submit`, { method: "POST", body: {} });
      onComplete();
    } catch {
      setErr("Submit failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 style={styles.h2}>Lender questions</h2>
        <div style={styles.ok}>Loading...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div>
        <h2 style={styles.h2}>Lender questions</h2>
        <div style={styles.intro}>There are no questions to answer right now.</div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.h2}>Lender questions</h2>
      <div style={styles.intro}>
        Please answer the questions below. Your answers are saved as you type; press Submit when you are done.
      </div>

      {err ? <div style={styles.err}>{err}</div> : null}

      {questions.map((q, i) => (
        <div key={q.id} style={styles.card}>
          <div style={styles.prompt}>
            {i + 1}. {q.prompt}
          </div>
          {q.review_status === "rejected" && q.reject_reason ? (
            <div style={styles.returned}>Please update this answer: {q.reject_reason}</div>
          ) : null}
          <textarea
            style={styles.textarea}
            value={answers[q.id] ?? ""}
            placeholder="Type your answer..."
            onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
            onBlur={(e) => autosave(q.id, e.target.value)}
          />
          {q.request_document ? (
            <div style={styles.docNote}>
              A supporting document is also requested. Attach a PDF, Word, Excel, or image file (max 25MB).
              <div style={styles.upRow}>
                <label style={styles.upLabel}>
                  {uploadingDoc[q.id] ? "Uploading..." : docNames[q.id] ? "Replace file" : "Choose file"}
                  <input
                    type="file"
                    accept={QA_UPLOAD_ACCEPT}
                    style={{ display: "none" }}
                    disabled={Boolean(uploadingDoc[q.id])}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void uploadDoc(q.id, f);
                    }}
                  />
                </label>
                {docNames[q.id] ? <span style={styles.upName}>{docNames[q.id]}</span> : null}
              </div>
              {docErr[q.id] ? <div style={styles.upErr}>{docErr[q.id]}</div> : null}
            </div>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        style={submitting ? styles.btnDisabled : styles.btn}
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? "Submitting..." : "Submit answers"}
      </button>
    </div>
  );
}
