// BF_CLIENT_LENDER_QA_v1
// CMP form behind the "Answer lender questions" button (cta_action 'lender_qa').
// Loads the questions the client must answer (newly sent or returned for a
// redo), autosaves each answer as they type, and submits them all at once.
import { useEffect, useState } from "react";
import { apiCall } from "@/api/client";

type Question = {
  id: string;
  position: number;
  prompt: string;
  request_document: boolean;
  answer_text: string | null;
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
              A supporting document is also requested for this question. Please upload it in your Documents list.
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
