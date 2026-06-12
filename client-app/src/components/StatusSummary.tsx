import { Card } from "./ui/Card";
import { safeParseDate } from "@/utils/safeDate";
import { Spinner } from "./ui/Spinner";
import { components, layout, tokens } from "@/styles";
import { useProcessingStatus } from "@/hooks/useProcessingStatus";
import type { ProcessingCheckpoint } from "@/types/processing";

type StatusSummaryProps = {
  applicationId: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = safeParseDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function renderStatusLine(status: ProcessingCheckpoint) {
  if (status.status === "processing") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Spinner />
        Processing
      </span>
    );
  }
  if (status.status === "completed") {
    const timestamp = formatTimestamp(status.completedAt);
    return (
      <span style={{ color: tokens.colors.success }}>
        ✓ Completed{timestamp ? ` ${timestamp}` : ""}
      </span>
    );
  }
  if (status.status === "failed") {
    return (
      <span style={{ color: tokens.colors.warning }}>⚠ Contact support</span>
    );
  }
  return <span>Pending</span>;
}

export function StatusSummary({ applicationId }: StatusSummaryProps) {
  const { status, pollState } = useProcessingStatus(applicationId);
  const statementCount = status?.financialReview.details?.receivedCount ?? null;
  const requiredStatements = status?.financialReview.details?.requiredCount ?? null;

  return (
    <Card>
      <div style={layout.stackTight}>
        <h2 style={components.form.sectionTitle}>Processing status</h2>
        <div style={{ color: tokens.colors.textSecondary, fontSize: "13px" }}>
          Refresh:{" "}
          {pollState === "terminal"
            ? "Locked"
            : pollState === "paused"
              ? "Paused"
              : pollState === "reconnecting"
                ? "Reconnecting"
                : "Polling"}
        </div>
        <div style={layout.stackTight}>
          <div style={components.form.eyebrow}>Document review</div>
          <ul
            style={{
              margin: 0,
              paddingLeft: tokens.spacing.lg,
              color: tokens.colors.textSecondary,
              display: "grid",
              gap: tokens.spacing.xs,
            }}
          >
            <li>Documents received</li>
            <li>{status ? renderStatusLine(status.documentReview) : "Pending"}</li>
          </ul>
        </div>
        <div style={layout.stackTight}>
          <div style={components.form.eyebrow}>Financial review</div>
          <ul
            style={{
              margin: 0,
              paddingLeft: tokens.spacing.lg,
              color: tokens.colors.textSecondary,
              display: "grid",
              gap: tokens.spacing.xs,
            }}
          >
            <li>
              {status ? renderStatusLine(status.financialReview) : "Pending"}
            </li>
            {requiredStatements !== null ? (
              <li>
                Statements received{" "}
                {statementCount !== null ? statementCount : "—"}/{requiredStatements}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </Card>
  );
}
