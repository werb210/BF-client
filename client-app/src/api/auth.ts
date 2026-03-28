import api from "../lib/api";

export const startOtp = async (phone: string) => {
  const { data } = await api.post("/api/auth/otp/start", { phone });
  return data;
};

export const verifyOtp = async (phone: string, code: string) => {
  const { data } = await api.post("/api/auth/otp/verify", { phone, code });

  if (data?.data?.token) {
    localStorage.setItem("auth_token", data.data.token);
  }

  return data;
};

export const sendOtp = startOtp;
export const verifyOtpCode = verifyOtp;
