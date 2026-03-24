import { apiRequest } from "@/lib/api";
import { normalizePhone } from "@/utils/normalizePhone";

export type OtpRequestResult = {
  ok: boolean;
  message?: string;
  status?: number;
};

export type OtpAuthData = {
  token: string;
  user: Record<string, unknown>;
  nextPath?: string;
};

export type StartOtpResponse = {
  ok: boolean;
};

export type LoginWithOtpResult = OtpAuthData;

export { normalizePhone };
export const normalizeOtpPhone = normalizePhone;

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await startOtp(phone);
  return {
    ok: true,
    status: 200,
  };
}

export async function startOtp(phone: string): Promise<StartOtpResponse> {
  return apiRequest<StartOtpResponse>("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string): Promise<LoginWithOtpResult> {
  const res = await apiRequest<OtpAuthData>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

  if (!res?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("token", res.token);

  return res;
}

export async function loginWithOtp(phone: string, code: string): Promise<LoginWithOtpResult> {
  return verifyOtp(phone, code);
}
