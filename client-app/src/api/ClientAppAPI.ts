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
};
