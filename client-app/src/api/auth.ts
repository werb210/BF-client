import { apiFetch } from "../lib/api";
import { setToken } from "../lib/auth";

export const startOtp = async (phone: string) => {
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
};

export const verifyOtp = async (phone: string, code: string) => {
  const data = await apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  if ((data as any)?.data?.token) {
    setToken((data as any).data.token);
  }

  return data;
};

export const sendOtp = startOtp;
export const verifyOtpCode = verifyOtp;
