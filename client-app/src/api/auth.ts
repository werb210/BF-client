import api from "../lib/api";
import { setToken } from "../lib/auth";

function assertPhone(phone: string) {
  if (typeof phone !== "string") {
    throw new Error("Phone is required");
  }
}

export const startOtp = async (phone: string) => {
  assertPhone(phone);
  const response = await api.post<{ ok?: boolean }>("/api/auth/otp/start", { phone });
  if (!response.data) {
    throw new Error("EMPTY RESPONSE");
  }
  return response.data;
};

export const verifyOtp = async (phone: string, code: string) => {
  assertPhone(phone);

  const response = await api.post<{ token?: string; user?: unknown; data?: { token?: string; user?: unknown } }>(
    "/api/auth/otp/verify",
    { phone, code }
  );

  const data = response.data;
  const token = data?.token ?? data?.data?.token;

  if (!token) {
    throw new Error("LOGIN FAILED — TOKEN MISSING");
  }

  setToken(token);
  localStorage.setItem("token", token);
  if (!localStorage.getItem("token")) {
    throw new Error("TOKEN SAVE FAILED");
  }

  if (!data) {
    throw new Error("EMPTY RESPONSE");
  }

  return data;
};

export const sendOtp = startOtp;
export const verifyOtpCode = verifyOtp;
