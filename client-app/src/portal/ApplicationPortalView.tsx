// @ts-nocheck
import { useId, useMemo, useRef } from "react";
import { components, layout, tokens } from "@/styles";
import { formatDocumentLabel } from "@/wizard/requirements";
import { ClientHistoryTimeline } from "@/components/ClientHistoryTimeline";
import type { ClientHistoryEvent } from "./clientHistory";

export type ApplicationDocumentStatus =
  | "missing"
  | "uploaded"
  | "accepted"
  | "rejected";

export type ApplicationDocumentCategory = {
  category: string;
  required: boolean;
  status: ApplicationDocumentStatus;
  rejectionReason?: string | null;
};

export type ApplicationPortalViewProps = {
  businessName: string;
  stage: string;
  statusMessage: string;
  helperText: string;
  documents: ApplicationDocumentCategory[];
  onUpload: (category: string, file: File) => Promise<void> | void;
  uploadState: Record<string, { uploading: boolean; progress: number }>;
  uploadErrors?: Record<string, string | null | undefined>;
  readOnly?: boolean;
  readOnlyMessage?: string | null;
  historyEvents?: ClientHistoryEvent[];
  onCallUs?: () => void;
  onEndCall?: () => void;
  callStatus?: "idle" | "connecting" | "connected" | "ended" | "error";
};

const ACCEPTED_FILE_TYPES =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.png,.jpg,.jpeg,.docx";

export function normalizeDocumentsResponse(
  data: unknown
): ApplicationDocumentCategory[] {
  if (!data) return [];
  const source = Array.isArray(data)
    ? data
    : Array.isArray((data as unknown)?.documents)
      ? (data as unknown).documents
      : Array.isArray((data as unknown)?.document_categories)
        ? (data as unknown).document_categories
        : [];

  return source
    .map((entry: unknown) => normalizeDocumentEntry(entry))
    .filter(
      (
        entry: ApplicationDocumentCategory | null
      ): entry is ApplicationDocumentCategory => entry !== null
    );
}

function normalizeDocumentEntry(
  entry: unknown
): ApplicationDocumentCategory | null {
  if (!entry) return null;
  const rawCategory =
    entry.category ||
    entry.category ||
    entry.documentType ||
    entry.document_type ||
    entry.name ||
    "";
  const category = String(rawCategory).trim();
  if (!category) return null;
  const required =
    typeof entry.required === "boolean"
      ? entry.required
      : typeof entry.is_required === "boolean"
        ? entry.is_required
        : entry.optional === true
          ? false
          : true;
  const rawStatus =
    entry.status ||
    entry.state ||
    entry.document_status ||
    entry.upload_status ||
    (entry.accepted ? "accepted" : null) ||
    (entry.rejected ? "rejected" : null) ||
    (entry.file_name || entry.uploaded_at ? "uploaded" : null) ||
    "missing";
  const normalizedStatus = normalizeStatus(rawStatus);
  const rejectionReason =
    entry.rejection_reason || entry.rejectionReason || entry.reason || null;

  return {
    category,
    required,
    status: normalizedStatus,
    rejectionReason,
  };
}

function normalizeStatus(value: unknown): ApplicationDocumentStatus {
  const normalized = String(value || "").toLowerCase();
  if (["accepted", "approved", "verified"].includes(normalized)) {
    return "accepted";
  }
  if (["rejected", "declined"].includes(normalized)) {
    return "rejected";
  }
  if (["uploaded", "received", "pending"].includes(normalized)) {
    return "uploaded";
  }
  return "missing";
}

export function formatStageLabel(stage: string) {
  if (!stage) return "In progress";
  return stage
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStageHelperText(stage: string) {
  if (stage.toUpperCase() === "DOCUMENTS_REQUIRED") {
    return "Please upload the requested documents";
  }
  return "Your application is being reviewed.";
}

export function getStatusBannerMessage(params: {
  stage: string;
  documents: ApplicationDocumentCategory[];
  documentReviewCompletedAt?: string | null;
  financialReviewCompletedAt?: string | null;
}) {
  const normalizedStage = String(params.stage || "").toUpperCase();
  if (normalizedStage === "DOCUMENTS_REQUIRED") {
    return "Additional documents are required to continue processing your application.";
  }
  if (normalizedStage === "OFF_TO_LENDER") {
    return "Your application has been submitted to lenders.";
  }
  if (normalizedStage === "OFFER") {
    return "An offer is available for your review.";
  }
  if (normalizedStage === "ACCEPTED") {
    return "Your application has been approved.";
  }
  if (normalizedStage === "REJECTED") {
    return "Your application was not approved.";
  }

  const requiredDocuments = params.documents.filter((doc) => doc.required);
  const hasRequiredDocuments = requiredDocuments.length > 0;
  const requiredDocsUploaded =
    hasRequiredDocuments &&
    requiredDocuments.every((doc) =>
      ["uploaded", "accepted"].includes(doc.status)
    );
  const hasBankStatementsUploaded = params.documents.some((doc) => {
    const isBankingDoc = doc.category.toLowerCase().includes("bank");
    return isBankingDoc && ["uploaded", "accepted"].includes(doc.status);
  });
  const documentReviewComplete = Boolean(params.documentReviewCompletedAt);
  const financialReviewComplete = Boolean(params.financialReviewCompletedAt);

  if (hasBankStatementsUploaded && !financialReviewComplete) {
    return "Your financial statements are being reviewed.";
  }

  if (requiredDocsUploaded && (!documentReviewComplete || !financialReviewComplete)) {
    return "Your documents have been received and are being reviewed.";
  }

  if (requiredDocsUploaded && documentReviewComplete && financialReviewComplete) {
    return "Your application is being prepared for the next step.";
  }

  if (["RECEIVED", "IN_REVIEW"].includes(normalizedStage)) {
    return "Your application is under review.";
  }

  return "Your application is under review.";
}

export function getDocumentStatusLabel(status: ApplicationDocumentStatus) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default:
      return "Missing";
  }
}

export function shouldShowUploadControl(
  document: ApplicationDocumentCategory
) {
  return document.required;
}

export function ApplicationPortalView({
  businessName,
  stage,
  statusMessage,
  helperText,
  documents,
  onUpload,
  uploadState,
  uploadErrors = {},
  readOnly = false,
  readOnlyMessage,
  historyEvents = [],
  onCallUs,
  onEndCall,
  callStatus = "idle",
}: ApplicationPortalViewProps) {
  const stageLabel = useMemo(() => formatStageLabel(stage), [stage]);

  return (
    <div style={layout.page}>
      <div style={layout.portalColumn}>
        {readOnly ? (
          <div
            style={{
              marginBottom: tokens.spacing.md,
              padding: tokens.spacing.md,
              borderRadius: tokens.radii.md,
              border: `1px solid ${tokens.colors.border}`,
              background: "rgba(59, 130, 246, 0.08)",
            }}
          >
            <div style={components.form.sectionTitle}>Read-only access</div>
            <p style={components.form.helperText}>
              {readOnlyMessage ||
                "This application is now read-only. Uploads and edits are disabled."}
            </p>
          </div>
        ) : null}
        <div
          style={{
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radii.md,
            padding: tokens.spacing.md,
            boxShadow: tokens.shadows.card,
            color: tokens.colors.textPrimary,
            marginBottom: tokens.spacing.lg,
          }}
        >
          <div style={components.form.eyebrow}>Status update</div>
          <div style={{ ...components.form.helperText, fontSize: "14px" }}>
            {statusMessage}
          </div>
        </div>
        <div style={components.form.sectionHeader}>
          <div style={components.form.eyebrow}>Client portal</div>
          <h1 style={components.form.title}>{businessName}</h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: tokens.spacing.sm,
              marginTop: tokens.spacing.xs,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "6px 12px",
                borderRadius: tokens.radii.pill,
                background: tokens.colors.background,
                color: tokens.colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {stageLabel}
            </span>
            <span style={components.form.helperText}>{helperText}</span>
          </div>
          {onCallUs ? (
            <div style={{ marginTop: tokens.spacing.md }}>
              {callStatus === "idle" && (
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={onCallUs}
                >
                  Call Us
                </button>
              )}

              {callStatus === "connecting" && (
                <div className="text-yellow-600">Connecting…</div>
              )}

              {callStatus === "connected" && (
                <div className="space-y-2">
                  <div className="text-green-600">Connected</div>
                  {onEndCall ? (
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded"
                      onClick={onEndCall}
                    >
                      End Call
                    </button>
                  ) : null}
                </div>
              )}

              {callStatus === "ended" && (
                <div className="text-gray-600">Call ended</div>
              )}

              {callStatus === "error" && (
                <div className="text-red-600">Call failed. Please try again.</div>
              )}
            </div>
          ) : null}
        </div>

        {historyEvents.length > 0 && (
          <section
            style={{
              marginTop: tokens.spacing.lg,
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radii.md,
              padding: tokens.spacing.md,
              boxShadow: tokens.shadows.card,
              color: tokens.colors.textPrimary,
            }}
          >
            <h2 style={components.form.sectionTitle}>Application history</h2>
            <ClientHistoryTimeline events={historyEvents} />
          </section>
        )}

        <section
          id="application-documents"
          style={{
            marginTop: tokens.spacing.xl,
            display: "flex",
            flexDirection: "column",
            gap: tokens.spacing.md,
          }}
        >
          <h2 style={components.form.sectionTitle}>Required documents</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {documents.map((document) => (
              <ApplicationDocumentRow
                key={document.category}
                document={document}
                onUpload={onUpload}
                uploadState={uploadState[document.category]}
                uploadError={uploadErrors[document.category] || undefined}
                readOnly={readOnly}
              />
            ))}
            {documents.length === 0 ? (
              <div style={components.form.helperText}>
                No document requirements available.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

type ApplicationDocumentRowProps = {
  document: ApplicationDocumentCategory;
  onUpload: (category: string, file: File) => Promise<void> | void;
  uploadState?: { uploading: boolean; progress: number };
  uploadError?: string;
  readOnly?: boolean;
};

function ApplicationDocumentRow({
  document,
  onUpload,
  uploadState,
  uploadError,
  readOnly = false,
}: ApplicationDocumentRowProps) {
  const statusLabel = getDocumentStatusLabel(document.status);
  const showUpload = shouldShowUploadControl(document);
  const isUploading = uploadState?.uploading ?? false;
  const progress = uploadState?.progress ?? 0;
  const isDisabled = document.status === "accepted" || isUploading || readOnly;

  return (
    <div
      style={{
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radii.md,
        padding: tokens.spacing.md,
        display: "grid",
        gap: tokens.spacing.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>
            {formatDocumentLabel(document.category)}
          </div>
          <div style={components.form.helperText}>
            {document.required ? "Required" : "Optional"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{statusLabel}</div>
          {document.status === "rejected" && document.rejectionReason ? (
            <div style={components.form.errorText}>
              Reason: {document.rejectionReason}
            </div>
          ) : null}
        </div>
      </div>
      {showUpload ? (
        <DocumentUploadControl
          documentCategory={document.category}
          onUpload={onUpload}
          disabled={isDisabled}
          uploading={isUploading}
          progress={progress}
        />
      ) : null}
      {uploadError ? (
        <div style={components.form.errorText}>{uploadError}</div>
      ) : null}
    </div>
  );
}

type DocumentUploadControlProps = {
  documentCategory: string;
  onUpload: (category: string, file: File) => Promise<void> | void;
  disabled: boolean;
  uploading: boolean;
  progress: number;
};

function DocumentUploadControl({
  documentCategory,
  onUpload,
  disabled,
  uploading,
  progress,
}: DocumentUploadControlProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void onUpload(documentCategory, file);
          event.target.value = "";
        }}
        disabled={disabled}
      />
      <button
        type="button"
        style={{
          ...components.buttons.secondary,
          ...components.buttons.base,
          width: "fit-content",
          opacity: disabled ? 0.6 : 1,
        }}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Upload
      </button>
      {uploading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <progress value={progress} max={100} />
          <span style={components.form.helperText}>
            Uploading… {progress}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
