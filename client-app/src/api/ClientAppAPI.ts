import { apiCall } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export const ClientAppAPI = {
  startOtp: (phone: string) =>
    apiCall(endpoints.otpStart, {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiCall(endpoints.otpVerify, {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};
