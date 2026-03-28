// @ts-nocheck
import { ClientAppAPI } from "../api/clientApp";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button, PrimaryButton, SecondaryButton } from "../components/ui/Button";
import MayaClientChat from "../components/MayaClientChat";
import { ClientErrorBoundary } from "../components/ClientErrorBoundary";
import { ClientProfileStore } from "../state/clientProfiles";
import { getPipelineStage } from "../realtime/pipeline";
import { useDocumentRejectionNotifications } from "../portal/useDocumentRejectionNotifications";
import { formatDocumentLabel } from "../wizard/requirements";
import {
  LinkedApplicationStore,
  createLinkedApplication,
} from "../applications/linkedApplications";
import { DocumentUploadList } from "../components/DocumentUploadList";
import { StatusTimeline } from "../components/StatusTimeline";
import { StatusSummary } from "../components/StatusSummary";
import { PIPELINE_STAGE_LABELS } from "../portal/timeline";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import { logout } from "../auth/logout";
import { syncRequiredDocumentsFromStatus } from "../documents/requiredDocumentsCache";
import { OfflineStore } from "../state/offline";
import { extractApplicationFromStatus } from "../applications/resume";
import {
  loadSubmissionStatusCache,
  saveSubmissionStatusCache,
  type SubmissionStatusSnapshot,
  fetchSubmissionStatus,
} from "../services/applicationStatus";
import {
  getSubmissionFailureBanner,
  getSubmissionStageBanner,
} from "../portal/submissionMessaging";
import { useClientSession } from "../hooks/useClientSession";
import { useProcessingStatusPoller } from "../hooks/useProcessingStatusPoller";
import { ClientHistoryTimeline } from "../components/ClientHistoryTimeline";
import { buildClientHistoryEvents } from "../portal/clientHistory";
import { updateClientSession } from "../state/clientSession";
import { components, layout, tokens } from "@/styles";

const setMessages = () => {};
const saveMessageHistory = () => {};

export function StatusPage(): JSX.Element {
  const token = new URLSearchParams(window.location.search).get("token");
  const { state: sessionState } = useClientSession(token);
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [rejectionNotice, setRejectionNotice] = useState<{
    documents: string[];
  } | null>(null);
  const [linkedAppError, setLinkedAppError] = useState<string | null>(null);
  const [linkedAppBusy, setLinkedAppBusy] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    SubmissionStatusSnapshot | null
  >(() => (token ? loadSubmissionStatusCache(token) : null));
  const navigate = useNavigate();
  const statusRef = useRef<Record<string, any> | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await ClientAppAPI.status(token);
      const { data } = res;
      setStatus(data);
    } catch {
    }
  }, [token]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!token) return;
    if (!ClientProfileStore.hasPortalSession(token)) {
      navigate("/portal", { replace: true });
      return;
    }
    refreshStatus();
  }, [navigate, refreshStatus, token]);

  useEffect(() => {
    if (!token) return;
    setSubmissionStatus(loadSubmissionStatusCache(token));
  }, [token]);

  const pollingEnabled = Boolean(token) && sessionState === "valid";

  const isTerminalStatus = useCallback((payload: Record<string, any> | null) => {
    const raw =
      payload?.status ||
      payload?.stage ||
      payload?.pipelineStatus ||
      payload?.state ||
      "";
    const normalized = String(raw).toLowerCase();
    return ["completed", "declined", "withdrawn"].some((terminal) =>
      normalized.includes(terminal)
    );
  }, []);

  const fetchStatus = useCallback(async () => {
    const res = await ClientAppAPI.status(token as string);
    const { data } = res;
    return data;
  }, [token]);

  const handleStatusUpdate = useCallback((next: Record<string, any> | null) => {
    setStatus(next);
  }, []);

  const handleStatusError = useCallback(() => {
  }, []);

  const { state: statusPollingState } = useProcessingStatusPoller({
    enabled: pollingEnabled,
    fetchStatus,
    onUpdate: handleStatusUpdate,
    onError: handleStatusError,
    isTerminal: isTerminalStatus,
    initialDelayMs: 5000,
    maxDelayMs: 45000,
  });

  useForegroundRefresh(() => {
    refreshStatus();
  }, [refreshStatus]);

  const applicationId = useMemo(() => {
    return (
      status?.applicationId ||
      status?.application?.applicationId ||
      status?.application?.id ||
      status?.id ||
      null
    );
  }, [status]);

  const submissionId = useMemo(() => {
    return (
      status?.submissionId ||
      status?.submission_id ||
      status?.submission?.id ||
      applicationId ||
      token ||
      null
    );
  }, [applicationId, status, token]);

  useEffect(() => {
    if (!token || !submissionId) return;
    updateClientSession(token, { submissionId });
  }, [submissionId, token]);

  const fetchSubmissionSnapshot = useCallback(async () => {
    return fetchSubmissionStatus(applicationId as string);
  }, [applicationId]);

  const handleSubmissionUpdate = useCallback(
    (snapshot: SubmissionStatusSnapshot) => {
      setSubmissionStatus(snapshot);
      if (token) {
        saveSubmissionStatusCache(token, snapshot);
      }
    },
    [token]
  );

  const handleSubmissionError = useCallback(() => {
  }, []);

  useProcessingStatusPoller({
    enabled: Boolean(applicationId) && pollingEnabled,
    fetchStatus: fetchSubmissionSnapshot,
    onUpdate: handleSubmissionUpdate,
    onError: handleSubmissionError,
    isTerminal: (snapshot) => snapshot.status !== "pending",
    initialDelayMs: 10000,
    maxDelayMs: 60000,
  });

  const fetchMessages = useCallback(async () => {
    const res = await ClientAppAPI.getMessages(token as string);
    const { data } = res;
    return data;
  }, [token]);

  const handleMessagesUpdate = useCallback(
    (nextMessages: unknown[]) => {
      setMessages(nextMessages);
      if (token) {
        saveMessageHistory(token, nextMessages);
      }
    },
    [token]
  );

  const handleMessagesError = useCallback(() => {
  }, []);

  useProcessingStatusPoller({
    enabled: pollingEnabled,
    fetchStatus: fetchMessages,
    onUpdate: handleMessagesUpdate,
    onError: handleMessagesError,
    isTerminal: () => isTerminalStatus(statusRef.current),
    initialDelayMs: 5000,
    maxDelayMs: 30000,
  });

  const stages = PIPELINE_STAGE_LABELS;

  const activeStage = useMemo(
    () => getPipelineStage(status, submissionStatus),
    [status, submissionStatus]
  );
  const submissionUpdatedLabel = useMemo(() => {
    if (!submissionStatus?.updatedAt) return null;
    const parsed = new Date(submissionStatus.updatedAt);
    if (Number.isNaN(parsed.getTime())) return submissionStatus.updatedAt;
    return parsed.toLocaleString();
  }, [submissionStatus]);
  const statusBanner = useMemo(
    () => getSubmissionStageBanner(activeStage),
    [activeStage]
  );
  const statusBannerLink = useMemo(() => {
    if (activeStage !== "Offer Available" || !applicationId) return null;
    return `/application/${applicationId}/offers`;
  }, [activeStage, applicationId]);
  const failureBanner = useMemo(() => {
    if (submissionStatus?.status !== "failed") return null;
    return getSubmissionFailureBanner(submissionStatus.rawStatus || undefined);
  }, [submissionStatus]);

  const historyEvents = useMemo(
    () =>
      buildClientHistoryEvents({
        status,
        submissionStatus,
        stageLabel: activeStage,
      }),
    [activeStage, status, submissionStatus]
  );

  const phone = useMemo(() => {
    return (
      status?.application?.financialProfile?.phone ||
      status?.financialProfile?.phone ||
      ClientProfileStore.getLastUsedPhone()
    );
  }, [status]);
  const linkedTokens = useMemo(() => {
    if (!phone) return [];
    return ClientProfileStore.listTokens(phone);
  }, [phone]);

  useEffect(() => {
    if (!token || !status) return;
    syncRequiredDocumentsFromStatus(status);
    if (phone) {
      ClientProfileStore.upsertProfile(phone, token);
    }
    const linkedTokens =
      status?.linkedApplicationTokens ||
      status?.linked_application_tokens ||
      [];
    if (Array.isArray(linkedTokens) && linkedTokens.length > 0) {
      LinkedApplicationStore.sync(token, linkedTokens);
      if (phone) {
        linkedTokens.forEach((linkedToken: string) => {
          ClientProfileStore.upsertProfile(phone, linkedToken);
        });
      }
    }
  }, [phone, status, token]);

  useDocumentRejectionNotifications({
    token,
    documents: status?.documents,
    onNotify: (notification) => {
      setRejectionNotice({ documents: notification.documents });
    },
  });

  async function startLinkedApplication() {
    if (!token) return;
    const financialProfile =
      status?.application?.financialProfile || status?.financialProfile;
    if (!financialProfile) {
      setLinkedAppError(
        "We couldn't find your financial profile to start a linked application."
      );
      return;
    }
    setLinkedAppBusy(true);
    setLinkedAppError(null);
    try {
      const newToken = await createLinkedApplication(
        token,
        financialProfile,
        "client_initiated"
      );
      if (phone) {
        ClientProfileStore.upsertProfile(phone, newToken);
      }
      const res = await ClientAppAPI.status(newToken);
      const hydrated = extractApplicationFromStatus(res?.data || {}, newToken);
      OfflineStore.save({
        ...hydrated,
        applicationToken: newToken,
        currentStep: 2,
      });
      navigate("/apply/step-2");
    } catch {
      setLinkedAppError("Unable to start a linked application. Please try again.");
    } finally {
      setLinkedAppBusy(false);
    }
  }

  function scrollToMessages() {
    document
      .getElementById("portal-messages")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  if (!token) {
    return (
      <div style={layout.page}>
        <div style={layout.centerColumn}>
          <Card>
            <div style={layout.stackTight}>
              <h1 style={components.form.sectionTitle}>Client portal unavailable</h1>
              <p style={components.form.subtitle}>
                We couldn’t find your application token. Use your magic link or
                start a new application.
              </p>
              <PrimaryButton
                onClick={() => navigate("/apply/step-1")}
                style={{ width: "100%" }}
              >
                Start new application
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (token && !ClientProfileStore.hasPortalSession(token)) {
    return (
      <div style={layout.page}>
        <div style={layout.centerColumn}>
          <Card>
            <div style={layout.stackTight}>
              <h1 style={components.form.sectionTitle}>Session expired</h1>
              <p style={components.form.subtitle}>
                Please verify your phone number again to access the portal.
              </p>
              <PrimaryButton
                style={{ width: "100%" }}
                onClick={() => navigate("/portal", { replace: true })}
              >
                Verify phone
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={layout.page}>
        <div style={layout.centerColumn}>
          <Card>
            <EmptyState>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: tokens.spacing.sm,
                }}
              >
                <Spinner />
                <span>Loading your status…</span>
              </div>
            </EmptyState>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={layout.page}>
      <div style={layout.portalColumn}>
        <Card>
          <div style={layout.stackTight}>
            <div style={layout.stackTight}>
              <div style={components.form.eyebrow}>Application status</div>
              <h1 style={components.form.title}>{activeStage}</h1>
              {submissionUpdatedLabel && (
                <div
                  style={components.form.helperText}
                  title={`Updated ${submissionUpdatedLabel}`}
                >
                  Updated {submissionUpdatedLabel}
                </div>
              )}
              <div style={components.form.helperText}>
                Status refresh:{" "}
                {statusPollingState === "terminal"
                  ? "Locked"
                  : statusPollingState === "paused"
                    ? "Paused"
                    : statusPollingState === "reconnecting"
                      ? "Reconnecting"
                      : "Polling"}
              </div>
            </div>

            <StatusTimeline stages={stages} activeStage={activeStage} />
          </div>
        </Card>

        {historyEvents.length > 0 && (
          <Card>
            <div style={layout.stackTight}>
              <h2 style={components.form.sectionTitle}>Application history</h2>
              <ClientHistoryTimeline events={historyEvents} />
            </div>
          </Card>
        )}

        {failureBanner && (
          <Card
            style={{
              border: `1px solid rgba(245, 158, 11, 0.35)`,
              background: "rgba(245, 158, 11, 0.1)",
            }}
          >
            <div style={layout.stackTight}>
              <div style={{ fontWeight: 600, color: tokens.colors.warning }}>
                {failureBanner.title}
              </div>
              <div style={components.form.subtitle}>{failureBanner.message}</div>
              <PrimaryButton
                style={{ width: "100%" }}
                onClick={scrollToMessages}
              >
                {failureBanner.cta}
              </PrimaryButton>
            </div>
          </Card>
        )}

        {statusBanner && !failureBanner && (
          <Card
            style={{
              border: `1px solid rgba(59, 130, 246, 0.2)`,
              background: "rgba(59, 130, 246, 0.08)",
            }}
          >
            <div style={layout.stackTight}>
              <div style={{ fontWeight: 600 }}>{statusBanner.title}</div>
              <div style={components.form.subtitle}>{statusBanner.message}</div>
              {statusBanner.cta && statusBannerLink ? (
                <PrimaryButton
                  style={{ width: "100%" }}
                  onClick={() => navigate(statusBannerLink)}
                >
                  {statusBanner.cta}
                </PrimaryButton>
              ) : null}
            </div>
          </Card>
        )}

        {rejectionNotice && (
          <Card
            style={{
              border: `1px solid rgba(245, 158, 11, 0.35)`,
              background: "rgba(245, 158, 11, 0.1)",
            }}
          >
            <div style={layout.stackTight}>
              <div style={{ fontWeight: 600, color: tokens.colors.warning }}>
                Action needed: documents rejected
              </div>
              <div style={components.form.subtitle}>
                We sent a single SMS and email summary covering the rejected
                files below. Please re-upload them to keep your application
                moving.
              </div>
              <DocumentUploadList
                documents={rejectionNotice.documents.map(formatDocumentLabel)}
              />
              <PrimaryButton
                style={{ width: "100%" }}
                onClick={() => navigate("/apply/step-5")}
              >
                Re-upload documents
              </PrimaryButton>
            </div>
          </Card>
        )}

        <StatusSummary applicationId={applicationId} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: tokens.spacing.lg,
          }}
        >
          <div style={{ display: "grid", gap: tokens.spacing.lg }}>
            <Card style={{ height: "fit-content" }}>
              <div style={layout.stackTight}>
                <h2 style={components.form.sectionTitle}>Actions</h2>
                <PrimaryButton
                  style={{ width: "100%" }}
                  onClick={() => navigate("/apply/step-5")}
                >
                  Upload required documents
                </PrimaryButton>
                <SecondaryButton
                  style={{ width: "100%" }}
                  onClick={() => navigate("/resume")}
                >
                  View application
                </SecondaryButton>
                <SecondaryButton
                  style={{ width: "100%" }}
                  onClick={startLinkedApplication}
                  disabled={linkedAppBusy}
                  loading={linkedAppBusy}
                >
                  Start new linked application
                </SecondaryButton>
                {linkedAppError && (
                  <div style={components.form.errorText}>{linkedAppError}</div>
                )}
                <SecondaryButton style={{ width: "100%" }} onClick={scrollToMessages}>
                  Messages
                </SecondaryButton>
                <SecondaryButton
                  style={{ width: "100%" }}
                  onClick={async () => {
                    await logout({ redirectTo: "/apply/step-1" });
                  }}
                >
                  New application
                </SecondaryButton>
                {linkedTokens.length > 0 && (
                  <div style={layout.stackTight}>
                    <div style={components.form.eyebrow}>Your applications</div>
                    {linkedTokens.map((linkedToken: string, index: number) => {
                      const isCurrent = linkedToken === token;
                      return (
                        <Button
                          key={linkedToken}
                          variant={isCurrent ? "primary" : "secondary"}
                          style={{ width: "100%" }}
                          onClick={() => {
                            ClientProfileStore.markPortalVerified(linkedToken);
                            navigate(`/status?token=${linkedToken}`);
                          }}
                        >
                          {isCurrent
                            ? `Application ${index + 1} (Current)`
                            : `Application ${index + 1}`}
                        </Button>
                      );
                    })}
                  </div>
                )}
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Personal Net Worth</SecondaryButton>
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Inventory Collateral Form</SecondaryButton>
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Equipment Collateral Form</SecondaryButton>
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Real Estate Collateral Form</SecondaryButton>
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Debt Schedule</SecondaryButton>
                <SecondaryButton style={{ width: "100%" }} onClick={() => navigate("/coming-soon")}>Media Attachments</SecondaryButton>
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: tokens.spacing.lg }}>
            <Card>
              <div style={layout.stackTight}>
                <h2 style={components.form.sectionTitle}>Messages</h2>
                <div style={components.form.helperText}>
                  Continue your secure conversation with Maya here.
                </div>
                <ClientErrorBoundary>
                  <MayaClientChat applicationId={applicationId} />
                </ClientErrorBoundary>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
