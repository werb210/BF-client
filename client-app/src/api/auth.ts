import api from "../lib/api";

export const startOtp = async (phone: string) => {
  if (typeof phone !== "string") {
    throw new Error("Invalid phone");
  }
  const { data } = await api.post("/api/auth/otp/start", { phone });
  return data;
};

export const verifyOtp = async (phone: string, code: string) => {
  if (typeof phone !== "string" || typeof code !== "string") {
    throw new Error("Invalid verification payload");
  }
  const { data } = await api.post("/api/auth/otp/verify", { phone, code });

  if (data?.token) {
    localStorage.setItem("auth_token", data.token);
  }

  return data;
};

export const sendOtp = startOtp;
export const verifyOtpCode = verifyOtp;
