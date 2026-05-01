import { apiRequest } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { patchApplication } from "@/client/autosave";

export const ClientAppAPI = {
  // Auth
  startOtp: (phone: string) =>
    apiRequest(endpoints.otpStart, {
      method: "POST",
      body: { phone },
    }),

  verifyOtp: (phone: string, code: string) =>
    apiRequest(endpoints.otpVerify, {
      method: "POST",
      body: { phone, code },
    }),

  // Application lifecycle
  start: (payload: Record<string, unknown>) =>
    apiRequest("/api/applications", {
      method: "POST",
      body: payload,
    }),

  update: (applicationId: string, payload: Record<string, unknown>) =>
    patchApplication(applicationId, { metadata: payload }),

  status: (applicationId: string) =>
    apiRequest(`/api/client/application/${applicationId}/status`),

  updateApplication: (applicationId: string, payload: Record<string, unknown>) =>
    patchApplication(applicationId, payload),

  // BF_CLIENT_BLOCK_1_16_SUBMIT_AND_SCHEMA_ERRORS — final submission of the
  // wizard payload. The server endpoint is at:
  //   POST /api/client/applications/:token/submit
  // and accepts body shape { app, normalized } per BF_WIZARD_TO_PORTAL_v33.
  submit: (applicationToken: string, body: Record<string, unknown>) =>
    apiRequest(`/api/client/applications/${encodeURIComponent(applicationToken)}/submit`, {
      method: "POST",
      body,
    }),
};
