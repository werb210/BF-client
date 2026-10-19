// BF_CLIENT_v828_FINISH_IMPORTED_FILE - Continue on a file Boreal prepared from documents the client gave a broker or
// lender: take it over on the server (it has no saved wizard progress yet) and open the wizard pre-filled, the same
// way signing in with that phone does.
import { apiCall } from "@/api/client";

export async function openPreparedApplication(id: string, navigate: (to: string) => void): Promise<void> {
  const claimed = await apiCall<any>(`/api/client/applications/${encodeURIComponent(id)}/claim-import`, { method: "POST", body: {} });
  const data = claimed?.data ?? claimed;
  const { setApplicationToken } = await import("@/auth/applicationToken");
  setApplicationToken(id);
  try {
    const { reconcileWithBootToken } = await import("@/state/useApplicationStore");
    reconcileWithBootToken();
  } catch { /* the wizard still opens */ }
  const { applyBrokerImport } = await import("@/wizard/brokerPrefill");
  applyBrokerImport(id, data?.brokerPrefill ?? null, data?.brokerName ?? null);
  navigate("/apply/step-1");
}
