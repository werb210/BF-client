import { apiRequest } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

export const ClientAppAPI = {
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
};
