// BF_CLIENT_v872_KYC - the optional "Verify your identity" step after the application is submitted. Boreal turns
// it on in Settings > ID verification; asking with ?wizard=1 opens the request on the server. Never blocks the client:
// any failure or a slow answer (over 4 seconds) goes straight to the client portal as before.
import { apiCall } from "@/api/client";

type Mine = { enabled?: boolean; wizard_step?: boolean; verifications?: Array<{ status: string }> };
const OPEN = new Set(["requested", "in_progress", "processing"]);

export async function idVerificationNext(applicationId: string, timeoutMs = 4000): Promise<boolean> {
  try {
    const call = apiCall<Mine>(`/api/client/kyc/applications/${encodeURIComponent(applicationId)}?wizard=1`);
    const r = await Promise.race([call, new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);
    return Boolean(r && r.enabled && r.wizard_step && (r.verifications ?? []).some((v) => OPEN.has(v.status)));
  } catch (err) {
    console.warn("[kyc] wizard step check failed; going to the portal", err instanceof Error ? err.message : String(err));
    return false;
  }
}
