import api from "@/lib/api"; // adjust path if needed

export async function sendOtp(phone: string) {
  if (!phone) throw new Error("phone required");

  const res = await api.post("/auth/send-otp", { phone });

  return res.data;
}

export async function verifyOtp(phone: string, code: string) {
  if (!phone || !code) {
    throw new Error("phone + code required");
  }

  const res = await api.post("/auth/verify-otp", { phone, code });

  if (!(res.data as { success?: boolean }).success) {
    throw new Error("OTP rejected");
  }

  return res.data;
}
