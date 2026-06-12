// BF_CLIENT_BLOCK_v870_SUBMIT_ATTEMPT_BEACON
// Fire-and-forget telemetry: tell the server an attempt is happening the instant
// Submit runs ("attempted"), and again on success ("completed"). A row that
// stays "attempted" is a submission that died in the browser and never arrived —
// previously invisible. Uses keepalive fetch (survives navigation, handles CORS).
// MUST NEVER throw or block submission.

type BeaconApp = {
  applicationToken?: string | null;
  applicant?: { phone?: string | null; email?: string | null } | null;
  business?: {
    businessName?: string | null;
    legalName?: string | null;
    companyName?: string | null;
  } | null;
  kyc?: { phone?: string | null } | null;
};

export function buildSubmitAttemptBody(
  app: BeaconApp,
  status: "attempted" | "completed" | "failed",
  error?: string,
): string {
  return JSON.stringify({
    applicationToken: app?.applicationToken ?? null,
    phone: app?.applicant?.phone ?? app?.kyc?.phone ?? null,
    email: app?.applicant?.email ?? null,
    businessName:
      app?.business?.businessName ??
      app?.business?.legalName ??
      app?.business?.companyName ??
      null,
    status,
    error: error ?? null,
  });
}

export function sendSubmitAttempt(
  app: BeaconApp,
  status: "attempted" | "completed" | "failed",
  error?: string,
): void {
  try {
    const base =
      (import.meta as any).env?.VITE_API_BASE_URL ?? "https://server.boreal.financial";
    void fetch(`${base}/api/client/submit-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildSubmitAttemptBody(app, status, error),
      keepalive: true,
      credentials: "include",
    }).catch(() => {});
  } catch {
    /* telemetry must never interfere with submission */
  }
}
