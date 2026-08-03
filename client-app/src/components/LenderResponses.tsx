// BF_CLIENT_LENDER_RESPONSES_v1
// Shows the applicant which lenders have come back on their file and why, when
// the answer was no. Staff record these in the portal's Lenders tab; the server
// returns an anonymous ordinal and the reason, never the lender's name.
//
//   GET /api/client/application/:id/lender-responses
//     -> { status: "ok", data: { responses: [{ ordinal, outcome, reason, created_at }] } }
//
// Renders nothing at all when there are no responses - an empty "no lenders
// have replied" panel reads as bad news on a file that is simply still out.
import { useEffect, useState } from "react";
import { ClientAppAPI } from "../api/clientApp";

type LenderResponse = {
  ordinal: number;
  outcome: string | null;
  reason: string | null;
  created_at: string | null;
};

export function LenderResponses({ applicationId }: { applicationId: string }) {
  const [responses, setResponses] = useState<LenderResponse[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await ClientAppAPI.lenderResponses(applicationId);
        const rows = body?.data?.responses ?? [];
        if (!cancelled) setResponses(Array.isArray(rows) ? rows : []);
      } catch {
        // A failure here should not take the status page down with it.
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (failed || responses.length === 0) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Lender responses
      </h3>
      <p style={{ fontSize: 13, color: "#666", marginTop: 0, marginBottom: 12 }}>
        We send your file to lenders one at a time. Here's what has come back so
        far.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {responses.map((response) => {
          const declined = (response.outcome ?? "").toLowerCase() !== "approved";
          return (
            <li
              key={response.ordinal}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: response.reason ? 6 : 0,
                }}
              >
                <strong style={{ fontSize: 14 }}>Lender {response.ordinal}</strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: declined ? "#fef2f2" : "#ecfdf5",
                    color: declined ? "#b91c1c" : "#047857",
                  }}
                >
                  {declined ? "Passed" : "Approved"}
                </span>
              </div>
              {response.reason ? (
                <div style={{ fontSize: 14, lineHeight: 1.45 }}>{response.reason}</div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p style={{ fontSize: 13, color: "#666" }}>
        A pass from one lender doesn't end your application — we keep working
        through our lender list.
      </p>
    </section>
  );
}

export default LenderResponses;
